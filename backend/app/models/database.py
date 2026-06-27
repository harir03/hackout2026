from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Applicant(Base):
    __tablename__ = "applicants"

    id = Column(String, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    dob = Column(Date, nullable=True)
    pan = Column(String, unique=True, index=True, nullable=True)
    aadhaar = Column(String, unique=True, index=True, nullable=True)
    face_photo_path = Column(String, nullable=True)
    liveness_score = Column(Float, nullable=True)
    risk_profile = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    consents = relationship("Consent", back_populates="applicant", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="applicant", cascade="all, delete-orphan")
    scores = relationship("Score", back_populates="applicant", cascade="all, delete-orphan")


class Consent(Base):
    __tablename__ = "consent"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False)
    consented_sources = Column(JSON, nullable=False)
    granted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    withdrawn_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    applicant = relationship("Applicant", back_populates="consents")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    balance_after = Column(Float, nullable=False)
    source = Column(String, nullable=False)

    applicant = relationship("Applicant", back_populates="transactions")


class Score(Base):
    __tablename__ = "scores"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False)
    risk_band = Column(String, nullable=False)
    tier = Column(String, nullable=False)
    model_version = Column(String, nullable=False)
    shap_details = Column(JSON, nullable=False)
    signal_conflicts = Column(JSON, nullable=False)
    hard_caps_applied = Column(JSON, nullable=False)
    has_conflicts = Column(Boolean, nullable=False)
    has_hard_cap = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    applicant = relationship("Applicant", back_populates="scores")


class AuditTrail(Base):
    __tablename__ = "audit_trail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    details = Column(JSON, nullable=False)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
