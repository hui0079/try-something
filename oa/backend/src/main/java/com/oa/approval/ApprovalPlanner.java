package com.oa.approval;

import com.oa.org.Role;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public final class ApprovalPlanner {

    private ApprovalPlanner() {
    }

    public static List<ResolvedStep> plan(List<StepCode> steps, Person applicant, List<Person> everyone) {
        List<ResolvedStep> kept = new ArrayList<>();
        for (StepCode step : steps) {
            List<Long> raw = resolve(step, applicant, everyone);
            if (raw.isEmpty()) {
                throw new ApprovalProblem("MISSING_APPROVER", "找不到" + step.label());
            }
            Set<Long> previous = kept.isEmpty()
                    ? Set.of()
                    : new LinkedHashSet<>(kept.get(kept.size() - 1).assigneeIds());
            List<Long> assignees = raw.stream()
                    .filter(id -> id != applicant.id())
                    .filter(id -> !previous.contains(id))
                    .distinct()
                    .toList();
            if (!assignees.isEmpty()) {
                kept.add(new ResolvedStep(step, List.copyOf(assignees)));
            }
        }
        return List.copyOf(kept);
    }

    static List<Long> resolve(StepCode step, Person applicant, List<Person> everyone) {
        return switch (step) {
            case DIRECT_MANAGER -> applicant.managerId() == null ? List.of() : List.of(applicant.managerId());
            case DEPT_HEAD -> applicant.departmentLeaderId() == null
                    ? List.of()
                    : List.of(applicant.departmentLeaderId());
            case FINANCE -> everyone.stream()
                    .filter(person -> person.role() == Role.FINANCE)
                    .map(Person::id)
                    .toList();
            case GM -> everyone.stream()
                    .filter(person -> person.role() == Role.GM)
                    .map(Person::id)
                    .toList();
        };
    }
}
