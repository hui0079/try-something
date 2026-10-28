package com.oa.approval;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "approval_route")
public class ApprovalRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "biz_type", nullable = false, length = 20)
    private BizType bizType;

    @Column(nullable = false)
    private int priority;

    @Column(name = "min_value", precision = 12, scale = 2)
    private BigDecimal minValue;

    @Column(name = "max_value", precision = 12, scale = 2)
    private BigDecimal maxValue;

    @Column(nullable = false, length = 200)
    private String steps;

    @Column(nullable = false)
    private boolean enabled;

    public Long getId() {
        return id;
    }

    public BizType getBizType() {
        return bizType;
    }

    public void setBizType(BizType bizType) {
        this.bizType = bizType;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public BigDecimal getMinValue() {
        return minValue;
    }

    public void setMinValue(BigDecimal minValue) {
        this.minValue = minValue;
    }

    public BigDecimal getMaxValue() {
        return maxValue;
    }

    public void setMaxValue(BigDecimal maxValue) {
        this.maxValue = maxValue;
    }

    public String getSteps() {
        return steps;
    }

    public void setSteps(String steps) {
        this.steps = steps;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public RouteRule toRule() {
        return new RouteRule(id, bizType, priority, minValue, maxValue, StepCodes.parse(steps), enabled);
    }
}
