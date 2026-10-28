package com.knowledgeflow.graph;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record GraphDocument(
        @NotNull Integer version,
        @NotBlank String title,
        String layout,
        @NotEmpty List<@Valid GraphNode> nodes,
        List<@Valid GraphEdge> edges
) {
    public GraphDocument {
        layout = layout == null || layout.isBlank() ? "horizontal" : layout;
        edges = edges == null ? List.of() : List.copyOf(edges);
    }

    public record GraphNode(
            @NotBlank String id,
            @NotBlank String type,
            @NotBlank String label,
            @NotBlank String description,
            List<String> technologies,
            List<String> conditions
    ) {
        public GraphNode {
            technologies = technologies == null ? List.of() : List.copyOf(technologies);
            conditions = conditions == null ? List.of() : List.copyOf(conditions);
        }
    }

    public record GraphEdge(
            @NotBlank String id,
            @NotBlank String source,
            @NotBlank String target,
            String label
    ) {
    }
}
