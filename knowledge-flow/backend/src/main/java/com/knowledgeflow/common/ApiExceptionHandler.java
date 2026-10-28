package com.knowledgeflow.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Map<String, Object>> handleApiException(ApiException exception) {
        return ResponseEntity.status(exception.getStatus()).body(Map.of(
                "error", new ErrorBody(
                        exception.getCode(),
                        exception.getMessage(),
                        exception.getFields()
                )
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception) {
        List<ApiException.FieldErrorDetail> fields = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> new ApiException.FieldErrorDetail(
                        error.getField(),
                        error.getDefaultMessage()
                ))
                .toList();

        return ResponseEntity.badRequest().body(Map.of(
                "error", new ErrorBody("INVALID_INPUT", "请求参数不正确", fields)
        ));
    }

    record ErrorBody(
            String code,
            String message,
            List<ApiException.FieldErrorDetail> fields
    ) {
    }
}
