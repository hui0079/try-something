package com.oa.process;

import com.oa.approval.BizType;
import com.oa.approval.ResolvedStep;
import com.oa.approval.StepCode;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class BpmnDefinitionsTest {

    @Test
    void buildsAnOrSignChainWithARejectGateway() {
        BpmnDefinitions.Definition definition = BpmnDefinitions.build(BizType.LEAVE, List.of(
                new ResolvedStep(StepCode.DIRECT_MANAGER, List.of(2L)),
                new ResolvedStep(StepCode.FINANCE, List.of(4L, 5L))
        ));

        String xml = definition.xml();
        assertTrue(definition.key().equals("approval_LEAVE_DIRECT_MANAGER_FINANCE"));
        assertTrue(xml.indexOf("id=\"step0\"") < xml.indexOf("id=\"step1\""));
        assertTrue(xml.contains("flowable:collection=\"${step0Assignees}\""));
        assertTrue(xml.contains("flowable:collection=\"${step1Assignees}\""));
        assertTrue(xml.contains("${nrOfCompletedInstances >= 1}"));
        assertTrue(xml.contains("${outcome == 'rejected'}"));
        assertTrue(xml.contains("targetRef=\"approveEnd\""));
        assertTrue(xml.contains("name=\"直属主管\""));
        assertTrue(xml.contains("name=\"财务\""));
    }
}
