package com.oa.approval;

import java.util.List;

public record ResolvedStep(StepCode code, List<Long> assigneeIds) {
}
