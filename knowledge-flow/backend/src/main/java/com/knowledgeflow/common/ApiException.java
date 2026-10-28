package com.knowledgeflow.common;

import org.springframework.http.HttpStatus;

import java.util.List;

public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final List<FieldErrorDetail> fields;

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, null);
    }

    public ApiException(
            HttpStatus status,
            String code,
            String message,
            List<FieldErrorDetail> fields
    ) {
        super(message);
        this.status = status;
        this.code = code;
        this.fields = fields;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public List<FieldErrorDetail> getFields() {
        return fields;
    }

    public record FieldErrorDetail(String path, String message) {
    }
}
