package com.oa.process;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oa.approval.ResolvedStep;

import java.util.List;

public final class SnapshotCodec {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(DeserializationFeature.USE_LONG_FOR_INTS);

    private static final TypeReference<List<ResolvedStep>> STEPS = new TypeReference<>() {
    };

    private SnapshotCodec() {
    }

    public static String write(List<ResolvedStep> steps) {
        try {
            return MAPPER.writeValueAsString(steps);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("无法保存审批步骤", exception);
        }
    }

    public static List<ResolvedStep> read(String json) {
        try {
            return MAPPER.readValue(json, STEPS);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("无法读取审批步骤", exception);
        }
    }
}
