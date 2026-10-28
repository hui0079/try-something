package com.oa.leave;

public enum LeaveType {
    ANNUAL,
    SICK,
    PERSONAL;

    public String label() {
        return switch (this) {
            case ANNUAL -> "年假";
            case SICK -> "病假";
            case PERSONAL -> "事假";
        };
    }
}
