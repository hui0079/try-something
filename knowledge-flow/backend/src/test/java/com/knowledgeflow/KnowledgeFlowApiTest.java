package com.knowledgeflow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class KnowledgeFlowApiTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void registerCreatesAuthenticatedSessionAndDuplicateEmailIsRejected() throws Exception {
        String email = "register@example.com";
        MockHttpSession session = register(email);

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content(credentials(email)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("EMAIL_EXISTS"));
    }

    @Test
    void loginRejectsInvalidCredentials() throws Exception {
        register("login@example.com");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"email":"login@example.com","password":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void graphCrudIsScopedToAuthenticatedUser() throws Exception {
        MockHttpSession owner = register("owner@example.com");
        MockHttpSession other = register("other@example.com");

        MvcResult created = mockMvc.perform(post("/api/graphs")
                        .session(owner)
                        .contentType(APPLICATION_JSON)
                        .content(validGraph("私有链路")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.graph.title").value("私有链路"))
                .andReturn();

        JsonNode body = objectMapper.readTree(created.getResponse().getContentAsString());
        String graphId = body.path("graph").path("id").asText();

        mockMvc.perform(get("/api/graphs/{id}", graphId).session(other))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/graphs/{id}", graphId).session(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.graph.content.nodes[0].id").value("start"));

        mockMvc.perform(delete("/api/graphs/{id}", graphId).session(owner))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/graphs/{id}", graphId).session(owner))
                .andExpect(status().isNotFound());
    }

    @Test
    void danglingEdgeIsRejectedWithFieldPath() throws Exception {
        MockHttpSession session = register("validation@example.com");

        mockMvc.perform(post("/api/graphs")
                        .session(session)
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "version": 1,
                                  "title": "错误链路",
                                  "nodes": [
                                    {"id":"start","type":"step","label":"开始","description":"开始"}
                                  ],
                                  "edges": [
                                    {"id":"broken","source":"start","target":"missing"}
                                  ]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_GRAPH"))
                .andExpect(jsonPath("$.error.message").value(org.hamcrest.Matchers.containsString("找不到终点节点")))
                .andExpect(jsonPath("$.error.fields[0].path").value("edges.0.target"));
    }

    @Test
    void acceptsExpandedNodeKinds() throws Exception {
        MockHttpSession session = register("kinds@example.com");

        mockMvc.perform(post("/api/graphs")
                        .session(session)
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "version": 1,
                                  "title": "多种节点",
                                  "nodes": [
                                    {"id":"s","type":"start","label":"入口","description":"从需求开始"},
                                    {"id":"p","type":"problem","label":"问题","description":"要解决登录"},
                                    {"id":"a","type":"alternative","label":"备选","description":"也可以用 JWT"},
                                    {"id":"t","type":"tool","label":"工具","description":"Maven 构建"},
                                    {"id":"d","type":"data","label":"数据","description":"用户表"},
                                    {"id":"i","type":"api","label":"接口","description":"登录 API"},
                                    {"id":"k","type":"risk","label":"风险","description":"明文密码"},
                                    {"id":"f","type":"reference","label":"参考","description":"文档"}
                                  ],
                                  "edges": []
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.graph.content.nodes.length()").value(8));
    }

    @Test
    void acceptsFrontendSampleGraph() throws Exception {
        MockHttpSession session = register("sample@example.com");
        String sample = new String(
                getClass().getResourceAsStream("/sample-graph.json").readAllBytes(),
                java.nio.charset.StandardCharsets.UTF_8
        );

        mockMvc.perform(post("/api/graphs")
                        .session(session)
                        .contentType(APPLICATION_JSON)
                        .content(sample))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.graph.title").value("本地运行一个全栈产品"))
                .andExpect(jsonPath("$.graph.content.layout").value("horizontal"))
                .andExpect(jsonPath("$.graph.content.nodes.length()").value(11));
    }

    private MockHttpSession register(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content(credentials(email)))
                .andExpect(status().isCreated())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private String credentials(String email) throws Exception {
        return objectMapper.writeValueAsString(
                new Credentials(email, "password123")
        );
    }

    private String validGraph(String title) throws Exception {
        return objectMapper.writeValueAsString(objectMapper.readTree("""
                {
                  "version": 1,
                  "title": "%s",
                  "nodes": [
                    {"id":"start","type":"step","label":"开始","description":"开始"}
                  ],
                  "edges": []
                }
                """.formatted(title)));
    }

    private record Credentials(String email, String password) {
    }
}
