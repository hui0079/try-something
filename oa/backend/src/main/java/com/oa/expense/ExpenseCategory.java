package com.oa.expense;

public enum ExpenseCategory {
    TRAVEL,
    OFFICE,
    ENTERTAINMENT,
    OTHER;

    public String label() {
        return switch (this) {
            case TRAVEL -> "差旅";
            case OFFICE -> "办公";
            case ENTERTAINMENT -> "招待";
            case OTHER -> "其他";
        };
    }
}
