package com.oa.approval;

public enum StepCode {
    DIRECT_MANAGER,
    DEPT_HEAD,
    FINANCE,
    GM;

    public String label() {
        return switch (this) {
            case DIRECT_MANAGER -> "直属主管";
            case DEPT_HEAD -> "部门负责人";
            case FINANCE -> "财务";
            case GM -> "总经理";
        };
    }
}
