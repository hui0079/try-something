plugins {
    java
}

group = "codecat"
version = "1.0.0"

val ideaHome = file("C:/Program Files/JetBrains/IntelliJ IDEA 2023.3.3")
val kotlinc = ideaHome.resolve("plugins/Kotlin/kotlinc/bin/kotlinc.bat")
val kotlinLib = ideaHome.resolve("plugins/Kotlin/kotlinc/lib")
val mainClasses = layout.buildDirectory.dir("classes/kotlin/main")
val testClasses = layout.buildDirectory.dir("classes/kotlin/test")

fun compileClasspath(): String {
    val jars = mutableListOf<File>()
    ideaHome.resolve("lib").listFiles { f -> f.extension == "jar" }?.let { jars.addAll(it) }
    ideaHome.resolve("plugins/java/lib").listFiles { f -> f.extension == "jar" }?.let { jars.addAll(it) }
    jars += kotlinLib.resolve("kotlin-stdlib.jar")
    jars += kotlinLib.resolve("kotlin-stdlib-jdk8.jar")
    return jars.joinToString(";") { it.absolutePath }
}

tasks.register<Exec>("compileKotlin") {
    inputs.dir("src/main/kotlin")
    outputs.dir(mainClasses)
    doFirst {
        val dest = mainClasses.get().asFile
        dest.mkdirs()
        val cmd = "kotlinc-local.bat -d \"${dest.absolutePath}\" -jvm-target 17 -cp \"${compileClasspath()}\" \"${file("src/main/kotlin").absolutePath}\""
        environment("JAVA_HOME", "C:\\Program Files\\Java\\jdk-17")
        commandLine("cmd", "/c", cmd)
    }
}

tasks.register<Exec>("compileTestKotlin") {
    dependsOn("compileKotlin")
    inputs.dir("src/test/kotlin")
    outputs.dir(testClasses)
    doFirst {
        val dest = testClasses.get().asFile
        dest.mkdirs()
        val cp = compileClasspath() + ";" +
            mainClasses.get().asFile.absolutePath + ";" +
            ideaHome.resolve("lib/junit4.jar").absolutePath
        val cmd = "kotlinc-local.bat -d \"${dest.absolutePath}\" -jvm-target 17 -cp \"$cp\" \"${file("src/test/kotlin").absolutePath}\""
        environment("JAVA_HOME", "C:\\Program Files\\Java\\jdk-17")
        commandLine("cmd", "/c", cmd)
    }
}

sourceSets {
    main {
        output.dir(mapOf("builtBy" to "compileKotlin"), mainClasses)
        java.setSrcDirs(emptyList<Any>())
    }
    test {
        output.dir(mapOf("builtBy" to "compileTestKotlin"), testClasses)
        java.setSrcDirs(emptyList<Any>())
    }
}

tasks.compileJava { enabled = false }
tasks.compileTestJava { enabled = false }

tasks.processResources {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}

tasks.test {
    dependsOn("compileTestKotlin")
    testClassesDirs = files(testClasses)
    classpath = files(
        testClasses,
        mainClasses,
        ideaHome.resolve("lib/junit4.jar"),
        kotlinLib.resolve("kotlin-stdlib.jar"),
        kotlinLib.resolve("kotlin-stdlib-jdk8.jar"),
        kotlinLib.resolve("kotlin-stdlib-jdk7.jar")
    )
    useJUnit()
}

tasks.jar {
    dependsOn("compileKotlin")
    archiveBaseName.set("code-cat")
    from(mainClasses)
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}

val sandboxConfig = layout.buildDirectory.dir("idea-sandbox/config")
val sandboxSystem = layout.buildDirectory.dir("idea-sandbox/system")
val sandboxPlugin = sandboxConfig.map { it.dir("plugins/code-cat") }

val prepareSandbox = tasks.register<Copy>("prepareSandbox") {
    dependsOn(tasks.jar)
    into(sandboxPlugin)
    from(tasks.jar) { into("lib") }
}

tasks.register<Exec>("runIde") {
    group = "intellij"
    description = "Launch local IntelliJ IDEA with Code Cat in a sandbox"
    dependsOn(prepareSandbox)
    val vmOptions = layout.buildDirectory.file("idea.vmoptions")
    doFirst {
        val config = sandboxConfig.get().asFile.absolutePath.replace('\\', '/')
        val system = sandboxSystem.get().asFile.absolutePath.replace('\\', '/')
        val base = ideaHome.resolve("bin/idea64.exe.vmoptions").readText()
        vmOptions.get().asFile.parentFile.mkdirs()
        vmOptions.get().asFile.writeText(
            base + "\n" +
                "-Didea.config.path=$config\n" +
                "-Didea.system.path=$system\n" +
                "-Didea.log.path=$system/log\n"
        )
        sandboxConfig.get().asFile.mkdirs()
        sandboxSystem.get().asFile.mkdirs()
    }
    environment("IDEA_VM_OPTIONS", vmOptions.map { it.asFile.absolutePath }.get())
    commandLine("cmd", "/c", ideaHome.resolve("bin/idea.bat").absolutePath)
}
