package com.oa.approval;

import com.oa.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;

@Service
public class RouteService {

    private final ApprovalRouteRepository routes;

    public RouteService(ApprovalRouteRepository routes) {
        this.routes = routes;
    }

    @Transactional(readOnly = true)
    public List<RouteResponse> list() {
        return routes.findAllByOrderByBizTypeAscPriorityDesc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public RouteResponse create(
            BizType bizType,
            int priority,
            BigDecimal minValue,
            BigDecimal maxValue,
            List<StepCode> steps,
            boolean enabled
    ) {
        ApprovalRoute route = new ApprovalRoute();
        apply(route, bizType, priority, minValue, maxValue, steps, enabled);
        return toResponse(routes.save(route));
    }

    @Transactional
    public RouteResponse update(
            long id,
            BizType bizType,
            int priority,
            BigDecimal minValue,
            BigDecimal maxValue,
            List<StepCode> steps,
            boolean enabled
    ) {
        ApprovalRoute route = routes.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "审批规则不存在"));
        apply(route, bizType, priority, minValue, maxValue, steps, enabled);
        return toResponse(route);
    }

    @Transactional
    public void delete(long id) {
        if (!routes.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "审批规则不存在");
        }
        routes.deleteById(id);
    }

    private void apply(
            ApprovalRoute route,
            BizType bizType,
            int priority,
            BigDecimal minValue,
            BigDecimal maxValue,
            List<StepCode> steps,
            boolean enabled
    ) {
        if (steps == null || steps.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROUTE", "至少需要一个审批步骤");
        }
        if (steps.size() != new HashSet<>(steps).size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROUTE", "审批步骤不能重复");
        }
        if (minValue != null && maxValue != null && minValue.compareTo(maxValue) >= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROUTE", "下限必须小于上限");
        }
        route.setBizType(bizType);
        route.setPriority(priority);
        route.setMinValue(minValue);
        route.setMaxValue(maxValue);
        route.setSteps(StepCodes.format(steps));
        route.setEnabled(enabled);
    }

    private RouteResponse toResponse(ApprovalRoute route) {
        return new RouteResponse(
                route.getId(),
                route.getBizType(),
                route.getPriority(),
                route.getMinValue(),
                route.getMaxValue(),
                StepCodes.parse(route.getSteps()),
                route.isEnabled()
        );
    }

    public record RouteResponse(
            long id,
            BizType bizType,
            int priority,
            BigDecimal minValue,
            BigDecimal maxValue,
            List<StepCode> steps,
            boolean enabled
    ) {
    }
}
