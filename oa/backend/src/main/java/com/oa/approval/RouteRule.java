package com.oa.approval;

import java.math.BigDecimal;
import java.util.List;

public record RouteRule(
        long id,
        BizType bizType,
        int priority,
        BigDecimal minValue,
        BigDecimal maxValue,
        List<StepCode> steps,
        boolean enabled
) {
}
