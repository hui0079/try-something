package com.oa.process;

import com.oa.approval.BizType;
import com.oa.notice.NoticeKind;
import com.oa.notice.NoticeService;
import org.flowable.engine.delegate.TaskListener;
import org.flowable.task.service.delegate.DelegateTask;
import org.springframework.stereotype.Component;

@Component("approvalTaskCreatedListener")
public class ApprovalTaskCreatedListener implements TaskListener {

    private final NoticeService notices;

    public ApprovalTaskCreatedListener(NoticeService notices) {
        this.notices = notices;
    }

    @Override
    public void notify(DelegateTask delegateTask) {
        if (delegateTask.getAssignee() == null) {
            return;
        }
        String bizType = stringVariable(delegateTask, "bizType");
        Number bizId = (Number) delegateTask.getVariable("bizId");
        String summary = stringVariable(delegateTask, "summary");
        if (bizType == null || bizId == null) {
            return;
        }
        notices.notifyUser(
                Long.parseLong(delegateTask.getAssignee()),
                BizType.valueOf(bizType),
                bizId.longValue(),
                NoticeKind.TASK,
                "新的待办",
                summary == null ? "" : summary
        );
    }

    private String stringVariable(DelegateTask delegateTask, String name) {
        Object value = delegateTask.getVariable(name);
        return value == null ? null : value.toString();
    }
}
