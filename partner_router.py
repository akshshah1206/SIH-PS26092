import math
import json
from typing import List, Dict, Any, Optional

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in km."""
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def route_channel_partners(
    user_lat: float,
    user_lon: float,
    partners_list: List[Dict[str, Any]],
    scheme_id: Optional[str] = None,
    partner_type: Optional[str] = None,
    max_radius_km: float = 500.0,
    allow_high_npa: bool = False
) -> List[Dict[str, Any]]:
    """
    Ranks and filters channel partners based on spatial proximity,
    scheme authorization, and operational health (NPA & Fund quota).
    """
    results = []

    for p in partners_list:
        p_lat = p["latitude"]
        p_lon = p["longitude"]
        dist = haversine_distance_km(user_lat, user_lon, p_lat, p_lon)

        # Parse authorized schemes if stored as json string
        authorized = p.get("authorized_schemes", [])
        if isinstance(authorized, str):
            try:
                authorized = json.loads(authorized)
            except Exception:
                authorized = []

        # Scheme compatibility check
        is_scheme_authorized = True
        if scheme_id and scheme_id not in authorized:
            is_scheme_authorized = False

        # Partner type filter
        if partner_type and partner_type.upper() != "ALL" and p["partner_type"] != partner_type.upper():
            continue

        # NPA and quota health evaluation
        npa = float(p.get("gross_npa_pct", 0.0))
        utilization = float(p.get("fund_utilization_pct", 0.0))
        status = p.get("status", "ACTIVE")

        is_eligible_for_routing = True
        routing_notes = []

        if npa >= 10.0:
            status = "RESTRICTED_NPA"
            is_eligible_for_routing = False
            routing_notes.append(f"CRITICAL: Gross NPA is {npa}%, exceeding MoSJE threshold (10%). Disqualified from new allocations to prevent fund lockup.")
        elif npa >= 7.0:
            routing_notes.append(f"Warning: Elevated NPA ({npa}%). Low allocation priority.")

        if utilization >= 95.0:
            status = "QUOTA_LOW"
            routing_notes.append("Fund Quota Alert: Available quarterly fund allocation is nearly exhausted (>95%). Processing may face queue delay.")
        else:
            remaining_crores = round(p.get("allocated_fund_crores", 0) - p.get("utilized_fund_crores", 0), 2)
            routing_notes.append(f"Active Fund Headroom: ₹{remaining_crores} Crores remaining for immediate disbursement.")

        # If strict routing is enabled, exclude frozen NPA partners unless requested
        if not allow_high_npa and not is_eligible_for_routing:
            eligibility_flag = False
        else:
            eligibility_flag = True

        # Routing Score (Composite of proximity, low NPA, and fast turnaround)
        # Closer distance = higher score, lower NPA = higher score, lower turnaround days = higher score
        dist_score = max(0, 100 - (dist / 5.0))
        npa_score = max(0, 100 - (npa * 8.0))
        turnaround_score = max(0, 100 - (p.get("avg_disbursement_days", 20) * 2.5))
        
        composite_rank = round((dist_score * 0.45) + (npa_score * 0.35) + (turnaround_score * 0.20), 1)

        results.append({
            **p,
            "authorized_schemes": authorized,
            "distance_km": dist,
            "composite_rank": composite_rank,
            "is_scheme_authorized": is_scheme_authorized,
            "is_eligible_for_routing": eligibility_flag,
            "health_status": status,
            "routing_notes": routing_notes
        })

    # Sort: Eligible partners first, then by composite rank descending (or distance ascending)
    results.sort(key=lambda x: (x["is_eligible_for_routing"], x["is_scheme_authorized"], x["composite_rank"]), reverse=True)
    return results
