package com.oa.process;

import org.flowable.engine.RuntimeService;
import org.flowable.engine.delegate.TaskListener;
import org.flowable.task.service.delegate.DelegateTask;
import org.springframework.stereotype.Component;

@Component("approvalOutcomeListener")
public class ApprovalOutcomeListener implements TaskListener {

    private final RuntimeService runtimeService;

    public ApprovalOutcomeListener(RuntimeService runtimeService) {
        this.runtimeService = runtimeService;
    }

    @Override
    public void notify(DelegateTask delegateTask) {
        Object outcome = delegateTask.getVariableLocal("outcome");
        if (outcome == null) {
            outcome = delegateTask.getVariable("outcome");
        }
        if (outcome == null) {
            outcome = "approved";
        }
        delegateTask.setVariableLocal("stepOutcome", outcome);
        runtimeService.setVariable(delegateTask.getProcessInstanceId(), "outcome", outcome);
    }
}
