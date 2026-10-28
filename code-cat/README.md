# 代码猫

IntelliJ 平台插件。一只像素橘猫走在编辑器当前行上：你停手它就睡，语法错误会把它吓一跳，编译成功它会伸懒腰。

## 本地运行

构建脚本认本机这两处路径：

- IntelliJ IDEA 2023.3.3：`C:/Program Files/JetBrains/IntelliJ IDEA 2023.3.3`
- JDK 17：`C:/Program Files/Java/jdk-17`

路径不同时，改 `build.gradle.kts` 里的 `ideaHome`，以及 `gradle.properties` 里的 `org.gradle.java.home`。

在 `code-cat` 目录：

```bat
gradlew.bat test
gradlew.bat runIde
```

`runIde` 用一份独立的沙箱配置启动 IDEA，插件装在这个沙箱里，不改你平时用的 IDE 配置。
