package com.oa;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Tag("integration")
class LeaveExpenseFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper json;

    @Test
    void twoDayLeaveEndsWithTheDirectManager() throws Exception {
        MockHttpSession alice = login("alice");
        long leaveId = createLeave(alice, "2");
        mockMvc.perform(post("/api/leaves/" + leaveId + "/submit").session(alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leave.status").value("IN_REVIEW"));

        MockHttpSession bob = login("bob");
        String taskId = onlyTodo(bob);
        mockMvc.perform(post("/api/tasks/" + taskId + "/approve")
                        .session(bob)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"同意\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/leaves/" + leaveId).session(alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leave.status").value("APPROVED"));
    }

    @Test
    void fiveDayLeaveReachesTheDepartmentHead() throws Exception {
        MockHttpSession alice = login("alice");
        long leaveId = createLeave(alice, "5");
        mockMvc.perform(post("/api/leaves/" + leaveId + "/submit").session(alice))
                .andExpect(status().isOk());

        MockHttpSession bob = login("bob");
        mockMvc.perform(post("/api/tasks/" + onlyTodo(bob) + "/approve")
                        .session(bob)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/leaves/" + leaveId).session(alice))
                .andExpect(jsonPath("$.leave.status").value("IN_REVIEW"));

        MockHttpSession lead = login("lead");
        mockMvc.perform(post("/api/tasks/" + onlyTodo(lead) + "/approve")
                        .session(lead)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"同意\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/leaves/" + leaveId).session(alice))
                .andExpect(jsonPath("$.leave.status").value("APPROVED"));
    }

    @Test
    void rejectedExpenseCanBeEditedAndSubmittedAgain() throws Exception {
        MockHttpSession alice = login("alice");
        long expenseId = createExpense(alice, "800");
        mockMvc.perform(post("/api/expenses/" + expenseId + "/submit").session(alice))
                .andExpect(status().isOk());

        MockHttpSession bob = login("bob");
        mockMvc.perform(post("/api/tasks/" + onlyTodo(bob) + "/reject")
                        .session(bob)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"事由不清\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/expenses/" + expenseId)
                        .session(alice)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"TRAVEL","amount":800,"reason":"补充出差说明"}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/expenses/" + expenseId + "/submit").session(alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expense.status").value("IN_REVIEW"));

        mockMvc.perform(post("/api/tasks/" + onlyTodo(bob) + "/approve")
                        .session(bob)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/expenses/" + expenseId).session(alice))
                .andExpect(jsonPath("$.expense.status").value("APPROVED"))
                .andExpect(jsonPath("$.history.length()").value(2));
    }

    @Test
    void outsiderCannotApproveAndLargeExpenseReachesFinance() throws Exception {
        MockHttpSession alice = login("alice");
        long expenseId = createExpense(alice, "8000");
        mockMvc.perform(post("/api/expenses/" + expenseId + "/submit").session(alice))
                .andExpect(status().isOk());

        MockHttpSession bob = login("bob");
        String taskId = onlyTodo(bob);
        mockMvc.perform(post("/api/tasks/" + taskId + "/approve")
                        .session(alice)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/expenses/" + expenseId).session(login("lead")))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/tasks/" + taskId + "/approve")
                        .session(bob)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        MockHttpSession finance = login("finance");
        mockMvc.perform(get("/api/tasks").session(finance))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].bizType").value("EXPENSE"))
                .andExpect(jsonPath("$[0].summary").value("8000 元"));
    }

    private long createLeave(MockHttpSession session, String days) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/leaves")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"leaveType":"ANNUAL","startDate":"2026-11-02","endDate":"2026-11-06","days":%s,"reason":"回家"}
                                """.formatted(days)))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private long createExpense(MockHttpSession session, String amount) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/expenses")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"TRAVEL","amount":%s,"reason":"客户拜访"}
                                """.formatted(amount)))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private String onlyTodo(MockHttpSession session) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/tasks").session(session))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode todos = json.readTree(result.getResponse().getContentAsString());
        if (todos.isEmpty()) {
            throw new AssertionError("没有待办");
        }
        return todos.get(0).get("id").asText();
    }

    private MockHttpSession login(String username) throws Exception {
        MockHttpSession session = new MockHttpSession();
        mockMvc.perform(post("/api/auth/login")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + username + "123\"}"))
                .andExpect(status().isOk());
        return session;
    }
}
