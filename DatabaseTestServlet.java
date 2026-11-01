package com.aeronexis.skyroute;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.SQLException;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet("/database-test")
public class DatabaseTestServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request,
                         HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("text/plain;charset=UTF-8");

        try (PrintWriter out = response.getWriter()) {

            try (Connection connection =
                         DatabaseConnection.getConnection()) {

                out.println("AeroNexis SkyRoute Database Test");
                out.println("--------------------------------");
                out.println("JDBC connection: SUCCESS");
                out.println("Database: "
                        + connection.getCatalog());
                out.println("Connection valid: "
                        + connection.isValid(5));

            } catch (SQLException e) {
                response.setStatus(
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

                out.println("JDBC connection: FAILED");
                out.println("Error: " + e.getMessage());

                getServletContext().log(
                        "SkyRoute database connection failed", e);
            }
        }
    }
}