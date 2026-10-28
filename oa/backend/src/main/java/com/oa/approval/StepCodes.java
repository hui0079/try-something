package com.oa.approval;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public final class StepCodes {

    private StepCodes() {
    }

    public static List<StepCode> parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(part -> !part.isEmpty())
                .map(StepCode::valueOf)
                .toList();
    }

    public static String format(List<StepCode> steps) {
        return steps.stream().map(Enum::name).collect(Collectors.joining(","));
    }
}
