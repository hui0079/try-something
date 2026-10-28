package com.knowledgeflow.graph;

import com.knowledgeflow.auth.AppUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/graphs")
public class GraphController {

    private final GraphService graphService;

    public GraphController(GraphService graphService) {
        this.graphService = graphService;
    }

    @GetMapping
    Map<String, List<GraphService.GraphResponse>> list(
            @AuthenticationPrincipal AppUserPrincipal user
    ) {
        return Map.of("graphs", graphService.list(user.id()));
    }

    @PostMapping
    ResponseEntity<Map<String, GraphService.GraphResponse>> create(
            @AuthenticationPrincipal AppUserPrincipal user,
            @Valid @RequestBody GraphDocument document
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("graph", graphService.create(user.id(), document)));
    }

    @GetMapping("/{id}")
    Map<String, GraphService.GraphResponse> get(
            @AuthenticationPrincipal AppUserPrincipal user,
            @PathVariable UUID id
    ) {
        return Map.of("graph", graphService.get(user.id(), id));
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(
            @AuthenticationPrincipal AppUserPrincipal user,
            @PathVariable UUID id
    ) {
        graphService.delete(user.id(), id);
        return ResponseEntity.noContent().build();
    }
}
