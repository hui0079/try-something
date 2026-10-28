package com.oa.approval;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

public final class RouteMatcher {

    private RouteMatcher() {
    }

    public static RouteRule match(List<RouteRule> rules, BizType bizType, BigDecimal value) {
        return rules.stream()
                .filter(RouteRule::enabled)
                .filter(rule -> rule.bizType() == bizType)
                .filter(rule -> contains(rule, value))
                .max(Comparator.comparingInt(RouteRule::priority).thenComparingLong(RouteRule::id))
                .orElseThrow(() -> new ApprovalProblem("NO_ROUTE", "没有匹配的审批流程"));
    }

    static boolean contains(RouteRule rule, BigDecimal value) {
        if (rule.minValue() != null && value.compareTo(rule.minValue()) <= 0) {
            return false;
        }
        if (rule.maxValue() != null && value.compareTo(rule.maxValue()) > 0) {
            return false;
        }
        return true;
    }
}
