package com.oa.process;

import com.oa.auth.AppUserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/processes")
public class ProcessDiagramController {

    private final ProcessService processes;

    public ProcessDiagramController(ProcessService processes) {
        this.processes = processes;
    }

    @GetMapping("/{id}/diagram")
    ProcessViews.DiagramView diagram(@PathVariable long id, Authentication authentication) {
        AppUserPrincipal actor = (AppUserPrincipal) authentication.getPrincipal();
        return processes.diagram(id, actor.id(), actor.role());
    }
}
