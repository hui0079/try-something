package com.oa.approval;

import com.oa.org.Role;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApprovalPlannerTest {

    private final Person alice = new Person(1, Role.EMPLOYEE, 2L, 3L);
    private final Person bob = new Person(2, Role.EMPLOYEE, 3L, 3L);
    private final Person lead = new Person(3, Role.EMPLOYEE, 6L, 3L);
    private final Person finance = new Person(4, Role.FINANCE, 6L, 4L);
    private final Person otherFinance = new Person(5, Role.FINANCE, 6L, 4L);
    private final Person gm = new Person(6, Role.GM, null, 6L);
    private final List<Person> people = List.of(alice, bob, lead, finance, otherFinance, gm);

    @Test
    void plansManagerThenDepartmentHead() {
        List<ResolvedStep> steps = ApprovalPlanner.plan(
                List.of(StepCode.DIRECT_MANAGER, StepCode.DEPT_HEAD),
                alice,
                people
        );
        assertEquals(List.of(2L), steps.get(0).assigneeIds());
        assertEquals(List.of(3L), steps.get(1).assigneeIds());
    }

    @Test
    void skipsApplicantAndDuplicateOfPreviousStep() {
        Person selfManaged = new Person(1, Role.EMPLOYEE, 1L, 3L);
        List<ResolvedStep> skippedSelf = ApprovalPlanner.plan(
                List.of(StepCode.DIRECT_MANAGER, StepCode.DEPT_HEAD),
                selfManaged,
                people
        );
        assertEquals(1, skippedSelf.size());
        assertEquals(StepCode.DEPT_HEAD, skippedSelf.get(0).code());

        List<ResolvedStep> skippedDuplicate = ApprovalPlanner.plan(
                List.of(StepCode.DIRECT_MANAGER, StepCode.DEPT_HEAD),
                bob,
                people
        );
        assertEquals(1, skippedDuplicate.size());
        assertEquals(List.of(3L), skippedDuplicate.get(0).assigneeIds());
    }

    @Test
    void orSignDropsApplicantAndKeepsTheRest() {
        Person financeApplicant = new Person(4, Role.FINANCE, 6L, 3L);
        List<ResolvedStep> steps = ApprovalPlanner.plan(List.of(StepCode.FINANCE), financeApplicant, people);
        assertEquals(List.of(5L), steps.get(0).assigneeIds());
    }

    @Test
    void missingApproverFails() {
        Person noManager = new Person(9, Role.EMPLOYEE, null, 3L);
        ApprovalProblem problem = assertThrows(
                ApprovalProblem.class,
                () -> ApprovalPlanner.plan(List.of(StepCode.DIRECT_MANAGER), noManager, people)
        );
        assertEquals("MISSING_APPROVER", problem.code());
        assertTrue(problem.getMessage().contains("直属主管"));
    }

    @Test
    void allStepsSkippedApprovesImmediately() {
        Person financeApplicant = new Person(4, Role.FINANCE, null, null);
        List<Person> onlySelf = List.of(financeApplicant);
        List<ResolvedStep> steps = ApprovalPlanner.plan(List.of(StepCode.FINANCE), financeApplicant, onlySelf);
        assertTrue(steps.isEmpty());
    }
}
