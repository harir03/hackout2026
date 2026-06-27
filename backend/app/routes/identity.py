import base64
import uuid
from typing import Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/identity", tags=["identity"])

DEMO_DATA: dict[str, dict[str, str | bool]] = {
    "hari": {
        "name": "Hari Kiran",
        "dob": "1990-01-01",
        "entity_type": "Individual",
        "aadhaar_linked": True,
    },
    "rahul": {
        "name": "Rahul Sharma",
        "dob": "1992-04-15",
        "entity_type": "Individual",
        "aadhaar_linked": True,
    },
    "nikhil": {
        "name": "Nikhil Varma",
        "dob": "1991-08-20",
        "entity_type": "Individual",
        "aadhaar_linked": True,
    },
    "akash": {
        "name": "Akash Gupta",
        "dob": "1989-11-05",
        "entity_type": "Individual",
        "aadhaar_linked": True,
    },
    "tejas": {
        "name": "Tejas Patel",
        "dob": "1993-02-28",
        "entity_type": "Individual",
        "aadhaar_linked": True,
    },
}


class PanVerifyRequest(BaseModel):
    pan: str
    phone: str = ""


class PanVerifyResponse(BaseModel):
    pan: str
    name: str
    dob: str
    entity_type: str
    aadhaar_linked: bool
    status: str


class AadhaarOtpRequest(BaseModel):
    aadhaar: str


class AadhaarOtpResponse(BaseModel):
    status: str
    message: str


class AadhaarVerifyRequest(BaseModel):
    aadhaar: str
    otp: str


class AadhaarVerifyResponse(BaseModel):
    status: str
    message: str


class LivenessRequest(BaseModel):
    image: str


class LivenessResponse(BaseModel):
    status: str
    face_detected: bool
    confidence: float
    message: str


@router.post("/pan", response_model=PanVerifyResponse)
async def verify_pan(request: PanVerifyRequest) -> PanVerifyResponse:
    pan_cleaned = request.pan.strip().upper()
    if len(pan_cleaned) != 10:
        raise HTTPException(status_code=400, detail="Invalid PAN format.")

    profile_name = "default"
    for num, name in {
        "9876543210": "hari",
        "9876543211": "rahul",
        "9876543212": "nikhil",
        "9876543213": "akash",
        "9876543214": "tejas",
    }.items():
        if request.phone.endswith(num):
            profile_name = name
            break

    profile = DEMO_DATA.get(
        profile_name,
        {
            "name": "RAJESH KUMAR",
            "dob": "1988-11-23",
            "entity_type": "Individual",
            "aadhaar_linked": True,
        },
    )

    return PanVerifyResponse(
        pan=pan_cleaned,
        name=profile["name"],
        dob=profile["dob"],
        entity_type=profile["entity_type"],
        aadhaar_linked=profile["aadhaar_linked"],
        status="verified",
    )


@router.post("/aadhaar/otp", response_model=AadhaarOtpResponse)
async def send_aadhaar_otp(request: AadhaarOtpRequest) -> AadhaarOtpResponse:
    aadhaar_cleaned = request.aadhaar.strip()
    if len(aadhaar_cleaned) != 12 or not aadhaar_cleaned.isdigit():
        raise HTTPException(status_code=400, detail="Invalid Aadhaar format.")

    return AadhaarOtpResponse(
        status="sent", message="OTP sent successfully to registered mobile."
    )


@router.post("/aadhaar/verify", response_model=AadhaarVerifyResponse)
async def verify_aadhaar_otp(
    request: AadhaarVerifyRequest,
) -> AadhaarVerifyResponse:
    if request.otp.strip() != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    return AadhaarVerifyResponse(
        status="verified", message="Aadhaar identity verification successful."
    )


@router.post("/liveness", response_model=LivenessResponse)
async def check_liveness(request: LivenessRequest) -> LivenessResponse:
    img_data = request.image
    if not img_data:
        raise HTTPException(status_code=400, detail="Missing base64 image data.")

    if "," in img_data:
        img_data = img_data.split(",")[1]

    try:
        base64.b64decode(img_data)
    except Exception:
        raise HTTPException(
            status_code=400, detail="Invalid base64 encoding schema."
        )

    return LivenessResponse(
        status="success",
        face_detected=True,
        confidence=0.984,
        message="Face verified and liveness check approved.",
    )
