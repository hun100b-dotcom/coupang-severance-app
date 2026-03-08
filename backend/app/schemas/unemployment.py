# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import Optional
from datetime import date


class UBPreciseRequest(BaseModel):
    company: str
    company_other: Optional[str] = ""
    end_date: Optional[date] = None
    age_50: bool = False


class UBPreciseResponse(BaseModel):
    eligible_180: bool
    insured_days_in_18m: int
    avg_daily_wage: float
    daily_benefit: float
    days: int
    total_estimate: float
    days_last_month: int
    company_found: bool
    error: Optional[str] = None


class UBSimpleRequest(BaseModel):
    insured_days: int
    avg_daily_wage: float
    age_50: bool = False


class UBSimpleResponse(BaseModel):
    eligible_180: bool
    insured_days_in_18m: int
    avg_daily_wage: float
    daily_benefit: float
    days: int
    total_estimate: float
