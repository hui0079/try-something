package com.oa.approval;

import org.springframework.http.HttpStatus;

public class ApprovalProblem extends RuntimeException {

    private final String code;

    public ApprovalProblem(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }

    public HttpStatus status() {
        return switch (code) {
            case "NOT_ASSIGNEE", "FORBIDDEN" -> HttpStatus.FORBIDDEN;
            case "TASK_CLOSED", "CANNOT_CANCEL", "INVALID_STATE" -> HttpStatus.CONFLICT;
            case "NOT_FOUND" -> HttpStatus.NOT_FOUND;
            default -> HttpStatus.BAD_REQUEST;
        };
    }
}
