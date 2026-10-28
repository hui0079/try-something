package com.oa.process;

import com.oa.approval.BizType;
import com.oa.approval.ResolvedStep;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public final class BpmnDefinitions {

    private BpmnDefinitions() {
    }

    public static Definition build(BizType bizType, List<ResolvedStep> steps) {
        String key = processKey(bizType, steps);
        String name = bizType == BizType.LEAVE ? "请假" : "报销";
        Layout layout = layout(steps);
        StringBuilder xml = new StringBuilder();
        xml.append("""
                <?xml version="1.0" encoding="UTF-8"?>
                <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
                             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                             xmlns:flowable="http://flowable.org/bpmn"
                             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                             targetNamespace="http://oa.local/approval">
                """);
        xml.append("  <process id=\"").append(key).append("\" name=\"").append(name)
                .append("\" isExecutable=\"true\">\n");
        xml.append("    <startEvent id=\"start\" name=\"提交\"/>\n");
        for (int i = 0; i < steps.size(); i++) {
            ResolvedStep step = steps.get(i);
            xml.append("    <userTask id=\"step").append(i).append("\" name=\"")
                    .append(step.code().label()).append("\" flowable:assignee=\"${assignee}\">\n");
            xml.append("""
                        <extensionElements>
                          <flowable:taskListener event="create" delegateExpression="${approvalTaskCreatedListener}"/>
                          <flowable:taskListener event="complete" delegateExpression="${approvalOutcomeListener}"/>
                        </extensionElements>
                    """);
            xml.append("      <multiInstanceLoopCharacteristics isSequential=\"false\" flowable:collection=\"${step")
                    .append(i).append("Assignees}\" flowable:elementVariable=\"assignee\">\n");
            xml.append("        <completionCondition><![CDATA[${nrOfCompletedInstances >= 1}]]></completionCondition>\n");
            xml.append("      </multiInstanceLoopCharacteristics>\n");
            xml.append("    </userTask>\n");
            xml.append("    <exclusiveGateway id=\"gate").append(i).append("\" default=\"flow_gate")
                    .append(i).append("_next\"/>\n");
            xml.append("    <endEvent id=\"reject").append(i).append("\" name=\"驳回\"/>\n");
        }
        xml.append("    <endEvent id=\"approveEnd\" name=\"通过\"/>\n");
        xml.append("    <sequenceFlow id=\"flow_start\" sourceRef=\"start\" targetRef=\"step0\"/>\n");
        for (int i = 0; i < steps.size(); i++) {
            xml.append("    <sequenceFlow id=\"flow_step").append(i).append("\" sourceRef=\"step").append(i)
                    .append("\" targetRef=\"gate").append(i).append("\"/>\n");
            xml.append("    <sequenceFlow id=\"flow_gate").append(i).append("_reject\" sourceRef=\"gate").append(i)
                    .append("\" targetRef=\"reject").append(i).append("\">\n");
            xml.append("      <conditionExpression xsi:type=\"tFormalExpression\"><![CDATA[${outcome == 'rejected'}]]></conditionExpression>\n");
            xml.append("    </sequenceFlow>\n");
            String next = i + 1 < steps.size() ? "step" + (i + 1) : "approveEnd";
            xml.append("    <sequenceFlow id=\"flow_gate").append(i).append("_next\" sourceRef=\"gate").append(i)
                    .append("\" targetRef=\"").append(next).append("\"/>\n");
        }
        xml.append("  </process>\n");
        xml.append("  <bpmndi:BPMNDiagram id=\"diagram\">\n");
        xml.append("    <bpmndi:BPMNPlane id=\"plane\" bpmnElement=\"").append(key).append("\">\n");
        for (Shape shape : layout.shapes()) {
            xml.append("      <bpmndi:BPMNShape id=\"shape_").append(shape.id()).append("\" bpmnElement=\"")
                    .append(shape.id()).append("\">\n");
            xml.append("        <dc:Bounds x=\"").append(shape.x()).append("\" y=\"").append(shape.y())
                    .append("\" width=\"").append(shape.width()).append("\" height=\"").append(shape.height())
                    .append("\"/>\n");
            xml.append("      </bpmndi:BPMNShape>\n");
        }
        for (Edge edge : layout.edges()) {
            xml.append("      <bpmndi:BPMNEdge id=\"edge_").append(edge.id()).append("\" bpmnElement=\"")
                    .append(edge.id()).append("\">\n");
            xml.append("        <di:waypoint x=\"").append(edge.x1()).append("\" y=\"").append(edge.y1()).append("\"/>\n");
            xml.append("        <di:waypoint x=\"").append(edge.x2()).append("\" y=\"").append(edge.y2()).append("\"/>\n");
            xml.append("      </bpmndi:BPMNEdge>\n");
        }
        xml.append("    </bpmndi:BPMNPlane>\n");
        xml.append("  </bpmndi:BPMNDiagram>\n");
        xml.append("</definitions>\n");
        return new Definition(key, xml.toString());
    }

    public static String processKey(BizType bizType, List<ResolvedStep> steps) {
        String codes = steps.stream().map(step -> step.code().name()).collect(Collectors.joining("_"));
        return "approval_" + bizType.name() + "_" + codes;
    }

    private static Layout layout(List<ResolvedStep> steps) {
        int taskWidth = 140;
        int taskHeight = 80;
        int gate = 40;
        int event = 36;
        int gap = 56;
        int mainY = 80;
        int cursor = 40;
        List<Shape> shapes = new ArrayList<>();
        List<Edge> edges = new ArrayList<>();
        int startY = mainY + (taskHeight - event) / 2;
        shapes.add(new Shape("start", cursor, startY, event, event));
        int previousRight = cursor + event;
        int previousMidY = startY + event / 2;
        cursor += event + gap;
        String previousFlow = "flow_start";
        for (int i = 0; i < steps.size(); i++) {
            int taskX = cursor;
            shapes.add(new Shape("step" + i, taskX, mainY, taskWidth, taskHeight));
            edges.add(new Edge(previousFlow, previousRight, previousMidY, taskX, mainY + taskHeight / 2));
            cursor += taskWidth + gap;
            int gateX = cursor;
            int gateY = mainY + (taskHeight - gate) / 2;
            shapes.add(new Shape("gate" + i, gateX, gateY, gate, gate));
            edges.add(new Edge("flow_step" + i, taskX + taskWidth, mainY + taskHeight / 2, gateX, gateY + gate / 2));
            int rejectY = mainY + taskHeight + 70;
            shapes.add(new Shape("reject" + i, gateX + (gate - event) / 2, rejectY, event, event));
            edges.add(new Edge(
                    "flow_gate" + i + "_reject",
                    gateX + gate / 2,
                    gateY + gate,
                    gateX + gate / 2,
                    rejectY
            ));
            previousRight = gateX + gate;
            previousMidY = gateY + gate / 2;
            previousFlow = "flow_gate" + i + "_next";
            cursor += gate + gap;
        }
        shapes.add(new Shape("approveEnd", cursor, startY, event, event));
        edges.add(new Edge(previousFlow, previousRight, previousMidY, cursor, startY + event / 2));
        return new Layout(shapes, edges);
    }

    public record Definition(String key, String xml) {
    }

    private record Shape(String id, int x, int y, int width, int height) {
    }

    private record Edge(String id, int x1, int y1, int x2, int y2) {
    }

    private record Layout(List<Shape> shapes, List<Edge> edges) {
    }
}
