package com.oa.approval;

import com.oa.auth.AppUserPrincipal;
import com.oa.common.ApiException;
import com.oa.org.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/approval-routes")
public class RouteController {

    private final RouteService routes;

    public RouteController(RouteService routes) {
        this.routes = routes;
    }

    @GetMapping
    List<RouteService.RouteResponse> list(Authentication authentication) {
        requireAdmin(authentication);
        return routes.list();
    }

    @PostMapping
    ResponseEntity<RouteService.RouteResponse> create(
            @Valid @RequestBody RouteRequest request,
            Authentication authentication
    ) {
        requireAdmin(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(save(request));
    }

    @PutMapping("/{id}")
    RouteService.RouteResponse update(
            @PathVariable long id,
            @Valid @RequestBody RouteRequest request,
            Authentication authentication
    ) {
        requireAdmin(authentication);
        return routes.update(
                id,
                request.bizType(),
                request.priority(),
                request.minValue(),
                request.maxValue(),
                request.steps(),
                request.enabled()
        );
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable long id, Authentication authentication) {
        requireAdmin(authentication);
        routes.delete(id);
        return ResponseEntity.noContent().build();
    }

    private RouteService.RouteResponse save(RouteRequest request) {
        return routes.create(
                request.bizType(),
                request.priority(),
                request.minValue(),
                request.maxValue(),
                request.steps(),
                request.enabled()
        );
    }

    private void requireAdmin(Authentication authentication) {
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        if (principal.role() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "需要管理员权限");
        }
    }

    public record RouteRequest(
            @NotNull BizType bizType,
            int priority,
            BigDecimal minValue,
            BigDecimal maxValue,
            @NotEmpty List<StepCode> steps,
            boolean enabled
    ) {
    }
}
