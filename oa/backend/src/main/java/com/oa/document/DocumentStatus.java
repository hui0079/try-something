package com.oa.document;

public enum DocumentStatus {
    DRAFT,
    IN_REVIEW,
    APPROVED,
    REJECTED,
    CANCELLED;

    public boolean editable() {
        return this == DRAFT || this == REJECTED || this == CANCELLED;
    }
}
