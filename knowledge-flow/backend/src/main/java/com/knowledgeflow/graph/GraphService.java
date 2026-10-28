package com.knowledgeflow.graph;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgeflow.common.ApiException;
import com.knowledgeflow.common.ApiException.FieldErrorDetail;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class GraphService {

    private static final Set<String> NODE_TYPES = Set.of(
            "start",
            "step",
            "problem",
            "condition",
            "technology",
            "tool",
            "data",
            "api",
            "alternative",
            "risk",
            "reference",
            "result"
    );

    private static final Set<String> LAYOUT_TYPES = Set.of(
            "horizontal",
            "vertical",
            "horizontal-reverse",
            "vertical-reverse"
    );

    private final KnowledgeGraphRepository graphs;
    private final ObjectMapper objectMapper;

    public GraphService(KnowledgeGraphRepository graphs, ObjectMapper objectMapper) {
        this.graphs = graphs;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<GraphResponse> list(UUID ownerId) {
        return graphs.findAllByOwnerIdOrderByUpdatedAtDesc(ownerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GraphResponse get(UUID ownerId, UUID id) {
        return toResponse(findOwned(ownerId, id));
    }

    @Transactional
    public GraphResponse create(UUID ownerId, GraphDocument document) {
        validate(document);
        try {
            KnowledgeGraph graph = new KnowledgeGraph(
                    ownerId,
                    document.title().trim(),
                    objectMapper.writeValueAsString(document)
            );
            return toResponse(graphs.save(graph));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("无法序列化图谱", exception);
        }
    }

    @Transactional
    public void delete(UUID ownerId, UUID id) {
        graphs.delete(findOwned(ownerId, id));
    }

    private KnowledgeGraph findOwned(UUID ownerId, UUID id) {
        return graphs.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "NOT_FOUND",
                        "图谱不存在"
                ));
    }

    private void validate(GraphDocument document) {
        if (document.version() == null || document.version() != 1) {
            invalid("version", "仅支持版本 1");
        }
        String layout = document.layout() == null || document.layout().isBlank()
                ? "horizontal"
                : document.layout();
        if (!LAYOUT_TYPES.contains(layout)) {
            invalid("layout", "不支持的布局类型");
        }

        Set<String> nodeIds = new HashSet<>();
        for (int index = 0; index < document.nodes().size(); index++) {
            GraphDocument.GraphNode node = document.nodes().get(index);
            if (!NODE_TYPES.contains(node.type())) {
                invalid("nodes." + index + ".type", "不支持的节点类型");
            }
            if (!nodeIds.add(node.id())) {
                invalid("nodes." + index + ".id", "节点 ID 重复");
            }
        }

        Set<String> edgeIds = new HashSet<>();
        for (int index = 0; index < document.edges().size(); index++) {
            GraphDocument.GraphEdge edge = document.edges().get(index);
            if (!edgeIds.add(edge.id())) {
                invalid("edges." + index + ".id", "连线 ID 重复");
            }
            if (!nodeIds.contains(edge.source())) {
                invalid("edges." + index + ".source", "找不到起点节点");
            }
            if (!nodeIds.contains(edge.target())) {
                invalid("edges." + index + ".target", "找不到终点节点");
            }
        }
    }

    private void invalid(String path, String message) {
        throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "INVALID_GRAPH",
                "图谱数据不符合协议（" + path + "：" + message + "）",
                List.of(new FieldErrorDetail(path, message))
        );
    }

    private GraphResponse toResponse(KnowledgeGraph graph) {
        try {
            return new GraphResponse(
                    graph.getId().toString(),
                    graph.getOwnerId().toString(),
                    graph.getTitle(),
                    objectMapper.readValue(graph.getContent(), GraphDocument.class),
                    graph.getCreatedAt(),
                    graph.getUpdatedAt()
            );
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("数据库中的图谱 JSON 无法解析", exception);
        }
    }

    public record GraphResponse(
            String id,
            String userId,
            String title,
            GraphDocument content,
            Instant createdAt,
            Instant updatedAt
    ) {
    }
}
