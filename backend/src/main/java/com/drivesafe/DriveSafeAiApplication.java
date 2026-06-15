package com.drivesafe;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class DriveSafeAiApplication {

    public static void main(String[] args) {
        SpringApplication.run(DriveSafeAiApplication.class, args);
    }
}