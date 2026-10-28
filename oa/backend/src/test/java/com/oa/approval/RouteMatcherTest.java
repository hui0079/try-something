package com.oa.approval;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RouteMatcherTest {

    private final List<RouteRule> rules = List.of(
            rule(1, BizType.LEAVE, 10, null, "3", StepCode.DIRECT_MANAGER),
            rule(2, BizType.LEAVE, 20, "3", null, StepCode.DIRECT_MANAGER, StepCode.DEPT_HEAD),
            rule(3, BizType.EXPENSE, 10, null, "1000", StepCode.DIRECT_MANAGER),
            rule(4, BizType.EXPENSE, 20, "1000", "5000", StepCode.DIRECT_MANAGER, StepCode.FINANCE),
            rule(5, BizType.EXPENSE, 30, "5000", null, StepCode.DIRECT_MANAGER, StepCode.FINANCE, StepCode.GM),
            rule(6, BizType.LEAVE, 50, null, "1", false, StepCode.GM)
    );

    @Test
    void matchesLeaveAndExpenseBoundaries() {
        assertEquals(1, match(BizType.LEAVE, "3").id());
        assertEquals(2, match(BizType.LEAVE, "3.1").id());
        assertEquals(1, match(BizType.LEAVE, "0.5").id());
        assertEquals(3, match(BizType.EXPENSE, "1000").id());
        assertEquals(4, match(BizType.EXPENSE, "1000.01").id());
        assertEquals(4, match(BizType.EXPENSE, "5000").id());
        assertEquals(5, match(BizType.EXPENSE, "5000.01").id());
        assertEquals(5, match(BizType.EXPENSE, "8000").id());
    }

    @Test
    void higherPriorityWinsWhenRangesOverlap() {
        List<RouteRule> overlapping = List.of(
                rule(1, BizType.LEAVE, 10, null, "10", StepCode.DIRECT_MANAGER),
                rule(2, BizType.LEAVE, 30, null, "10", StepCode.GM)
        );
        assertEquals(2, RouteMatcher.match(overlapping, BizType.LEAVE, new BigDecimal("2")).id());
    }

    @Test
    void disabledRuleIsIgnored() {
        assertEquals(1, match(BizType.LEAVE, "1").id());
    }

    @Test
    void missingRuleFails() {
        ApprovalProblem problem = assertThrows(
                ApprovalProblem.class,
                () -> RouteMatcher.match(List.of(), BizType.LEAVE, new BigDecimal("1"))
        );
        assertEquals("NO_ROUTE", problem.code());
    }

    private RouteRule match(BizType bizType, String value) {
        return RouteMatcher.match(rules, bizType, new BigDecimal(value));
    }

    private RouteRule rule(long id, BizType bizType, int priority, String min, String max, StepCode... steps) {
        return rule(id, bizType, priority, min, max, true, steps);
    }

    private RouteRule rule(
            long id,
            BizType bizType,
            int priority,
            String min,
            String max,
            boolean enabled,
            StepCode... steps
    ) {
        return new RouteRule(
                id,
                bizType,
                priority,
                min == null ? null : new BigDecimal(min),
                max == null ? null : new BigDecimal(max),
                List.of(steps),
                enabled
        );
    }
}
