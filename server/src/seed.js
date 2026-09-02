import { db, count, parseJSON } from "./db.js";
import { hashPassword } from "./auth.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedSetting(key, value) {
  await db.prepare("INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)").run(key, value);
}

export async function seed() {
  // ---------- 用户与角色 ----------
  // 注意：INSERT IGNORE 是 MySQL 特有语法，项目仅支持 MySQL 数据库模式
  await db.prepare(
    "INSERT IGNORE INTO users (username, password_hash, name, role, phone, email, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "admin",
    hashPassword("admin123"),
    "超级管理员",
    "superadmin",
    "13888880000",
    "admin@ynyzzn.com",
    1
  );
  await db.prepare(
    "INSERT IGNORE INTO users (username, password_hash, name, role, phone, email, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "editor",
    hashPassword("editor123"),
    "内容编辑",
    "editor",
    "13888880001",
    "editor@ynyzzn.com",
    1
  );

  // 确保已存在的默认账号也标记为需要修改密码
  await db.prepare("UPDATE users SET must_change_password = 1 WHERE username IN ('admin', 'editor') AND password_hash IS NOT NULL").run();

  const roleDefs = [
    ["超级管理员", "superadmin", "全部模块权限，含用户与权限管理、系统设置、操作日志", ["*"]],
    ["内容编辑", "editor", "产品、案例、解决方案、新闻等内容的新增、编辑与发布", ["product", "case", "solution", "article", "download"]],
    ["运营人员", "operator", "内容编辑权限 + 留言咨询处理 + 数据统计查看", ["product", "case", "solution", "article", "download", "message", "stat"]],
  ];
  for (const [name, code, desc, perms] of roleDefs) {
    await db.prepare("INSERT IGNORE INTO roles (name, code, description, permissions) VALUES (?, ?, ?, ?)").run(
      name, code, desc, JSON.stringify(perms)
    );
  }

  // ---------- 站点设置 ----------
  await seedSetting("site_name", "云南驰耀科技有限公司");
  await seedSetting("site_short_name", "驰耀科技");
  await seedSetting("site_en_name", "CHIYAO TECHNOLOGY");
  await seedSetting("site_domain", "ynyzzn.com");
  await seedSetting("site_icp", "滇ICP备2024047880号-1");
  await seedSetting("site_icp_url", "https://beian.miit.gov.cn");
  await seedSetting("site_phone", "0871-6789 0000");
  await seedSetting("site_mobile", "138 8888 0000");
  await seedSetting("site_email", "info@ynyzzn.com");
  await seedSetting("site_address", "云南省昆明市五华区高新技术产业开发区科技路88号");
  await seedSetting("site_slogan", "智慧物联 · 科技赋能");
  await seedSetting("site_description", "云南驰耀科技有限公司以物联网平台、智慧化解决方案、安防监控与信息化系统集成为核心业务方向，业务覆盖产品研发、方案设计与项目实施交付。");
  await seedSetting("seo_title", "云南驰耀科技 - 智慧物联 · 科技赋能 | 物联网平台解决方案专家");
  await seedSetting("seo_keywords", "云南驰耀科技,物联网平台,智慧化解决方案,安防监控,系统集成,智慧物联");
  await seedSetting("seo_description", "云南驰耀科技有限公司专注物联网平台、智慧化解决方案、安防监控与信息化系统集成，提供产品研发、方案设计与实施交付一体化服务。");

  // ---------- Banner ----------
  if ((await count("banners")) === 0) {
    const banners = [
      ["智慧物联 · 科技赋能", "深耕物联网平台与智慧化解决方案，让数据驱动产业升级", "构建万物互联的智能世界", "", "了解产品", "/产品中心"],
      ["安防监控 · 智慧守护", "从感知到决策，一站式安防监控与信息化系统集成服务", "安全 · 稳定 · 可靠", "", "查看案例", "/案例展示"],
      ["解决方案 · 行业深耕", "面向智慧园区、智慧校园、智慧安防等行业场景的深度定制", "以场景化方案创造真实价值", "", "解决方案", "/解决方案"],
    ];
    const stmt = db.prepare(
      "INSERT INTO banners (title, subtitle, slogan, image, link, button_text, sort, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
    );
    for (let i = 0; i < banners.length; i++) await stmt.run(...banners[i], i + 1);
  }

  // ---------- 产品分类与产品 ----------
  if ((await count("product_categories")) === 0) {
    const cats = [
      ["物联网平台", "link", "面向行业应用的物联网连接与管理平台", 1],
      ["安防监控设备", "camera", "高清智能摄像机与视频监控系统", 2],
      ["智慧硬件终端", "chip", "边缘计算网关、传感终端等智能硬件", 3],
      ["系统集成服务", "layers", "信息化系统集成与工程实施服务", 4],
    ];
    const cstmt = db.prepare("INSERT INTO product_categories (name, icon, description, sort, status) VALUES (?, ?, ?, ?, 1)");
    for (const c of cats) await cstmt.run(...c);

    const catIds = await db.prepare("SELECT id, name FROM product_categories").all();
    const catMap = Object.fromEntries(catIds.map((c) => [c.name, c.id]));
    const pstmt = db.prepare(
      `INSERT INTO products (category_id, name, model, cover, images, intro, detail, params, docs, status, sort, seo_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    );
    const products = [
      {
        cat: "物联网平台", name: "驰耀物联云平台", model: "CY-IoT V3.0",
        intro: "面向行业应用的物联网设备连接与管理平台，支持百万级设备接入、实时数据采集、规则引擎与可视化大屏。",
        detail: "驰耀物联云平台是一款集设备接入、数据管理、业务应用于一体的物联网基础平台。平台基于微服务架构，支持 MQTT、CoAP、HTTP 等多种接入协议，提供设备管理、数据采集、告警联动、规则引擎、数据可视化等核心能力，可广泛应用于智慧园区、智慧农业、智慧工业等场景。平台提供开放 API 与标准 SDK，支持与第三方业务系统快速集成。",
        params: [["设备接入能力", "百万级设备并发接入"], ["支持协议", "MQTT / CoAP / HTTP / TCP"], ["数据吞吐", "10万级消息/秒"], ["部署方式", "公有云 / 私有化部署"], ["开放能力", "REST API + SDK"], ["可视化", "数据大屏 / 3D 场景"]],
        sort: 1,
      },
      {
        cat: "物联网平台", name: "驰耀可视化大屏系统", model: "CY-Dashboard",
        intro: "灵活配置的数据可视化大屏系统，拖拽式搭建，实时数据展示，适配各类指挥中心与展示大屏。",
        detail: "可视化大屏系统提供丰富的图表组件与行业模板，通过拖拽式编辑器即可快速搭建数据大屏。系统支持实时数据推送、地图联动、多屏协同，可对接各类业务数据库与物联网平台，广泛应用于指挥中心、运营监控、展厅展示等场景。",
        params: [["组件库", "50+ 可视化组件"], ["数据源", "MySQL / API / MQTT / WebSocket"], ["布局方式", "拖拽式自由布局"], ["多屏联动", "支持多屏同步展示"]],
        sort: 2,
      },
      {
        cat: "安防监控设备", name: "400万像素智能网络摄像机", model: "CY-IPC400",
        intro: "400万像素星光级智能网络摄像机，支持人脸识别、周界防范、智能侦测，适用于园区与重点区域监控。",
        detail: "本产品采用 400 万像素 1/1.8 英寸 CMOS 传感器，支持星光级超低照度成像，内置 AI 芯片，支持人脸识别、区域入侵、越界侦测等智能分析功能。支持 H.265 视频编码，节省 50% 存储空间，适用于园区周界、出入口、重点部位等场景。",
        params: [["像素", "400万 (2560×1440)"], ["夜视能力", "星光级 0.001Lux"], ["智能分析", "人脸 / 周界 / 越界"], ["编码", "H.265 / H.264"], ["防护等级", "IP67"]],
        sort: 3,
      },
      {
        cat: "安防监控设备", name: "NVR 网络硬盘录像机", model: "CY-NVR32",
        intro: "32路网络硬盘录像机，支持多路预览回放、智能检索与 RAID 存储，构建高可靠视频存储方案。",
        detail: "32 路网络硬盘录像机支持 32 路 IPC 接入与同步回放，支持 H.265 高效解码，内置智能分析引擎，支持人员/车辆检索。支持 RAID0/1/5 磁盘阵列，保障视频数据安全，适用于中大型安防监控项目。",
        params: [["通道数", "32 路"], ["解码能力", "8 路 4K @30fps"], ["存储", "RAID0/1/5，支持 8 盘位"], ["智能检索", "人员 / 车辆 / 行为"]],
        sort: 4,
      },
      {
        cat: "智慧硬件终端", name: "边缘计算智能网关", model: "CY-EG200",
        intro: "工业级边缘计算网关，支持多协议接入、本地数据处理与断网续传，为边缘智能提供算力支撑。",
        detail: "边缘计算智能网关采用工业级设计，支持 RS485、CAN、以太网、4G/5G 等多种接口，内置 200+ 工业协议，支持本地数据清洗、规则计算与断网续传，配合云端平台实现边云协同，广泛适用于工业现场、智慧农业、能源监测等场景。",
        params: [["处理器", "四核 ARM Cortex-A55"], ["接口", "RS485×2 / CAN / 网口×4 / 5G"], ["协议库", "200+ 工业协议"], ["供电", "DC 9-36V 宽压"]],
        sort: 5,
      },
      {
        cat: "系统集成服务", name: "智慧园区系统集成", model: "CY-Integration",
        intro: "面向园区的信息化系统集成服务，涵盖综合布线、网络、安防、一卡通、信息发布等子系统。",
        detail: "智慧园区系统集成服务提供从咨询设计、设备选型、施工部署到运维保障的一体化交付。覆盖综合布线、计算机网络、视频监控、门禁一卡通、入侵报警、信息发布、机房建设等子系统，帮助园区构建安全、高效、智能的运营环境。",
        params: [["服务范围", "设计 / 施工 / 运维"], ["子系统", "10+ 类智能化子系统"], ["交付标准", "国家/行业规范"], ["售后服务", "7×24 小时响应"]],
        sort: 6,
      },
    ];
    for (const p of products) {
      await pstmt.run(catMap[p.cat], p.name, p.model, "", JSON.stringify([]), p.intro, p.detail,
        JSON.stringify(p.params), JSON.stringify([]), p.sort, p.name);
    }
  }

  // ---------- 解决方案 ----------
  if ((await count("solutions")) === 0) {
    const sols = [
      {
        name: "智慧园区解决方案", industry: "智慧园区",
        intro: "面向产业园区、办公园区的一体化智慧运营方案，实现安防、能耗、停车、访客等场景的数字化管理。",
        detail: "智慧园区解决方案以「1个平台 + N个应用」为架构，融合物联网感知、视频AI、大数据分析等技术，建设智慧安防、智慧通行、智慧能耗、智慧办公等应用，全面提升园区运营效率与安全水平。",
        scenario: "适用于产业园区、科技园区、办公园区、物流园区等场景，解决安防管理分散、能耗浪费、通行效率低、运营数据不透明等痛点。",
        architecture: "感知层（IPC/门禁/传感器）→ 网络层（有线/无线/物联网）→ 平台层（驰耀物联云平台）→ 应用层（安防/能耗/通行/办公）→ 展示层（运营大屏/移动端）",
        values: ["安防事件响应时间缩短 60%", "园区能耗降低 20%", "通行效率提升 45%", "运营数据一屏可视"],
      },
      {
        name: "智慧校园安防解决方案", industry: "智慧教育",
        intro: "覆盖校园全场景的安防与信息化方案，构建「事前预防、事中处置、事后追溯」的平安校园体系。",
        detail: "智慧校园安防解决方案围绕校园安全核心诉求，建设视频监控、人脸识别、入侵报警、访客管理、电子巡查等子系统，并联动应急广播与指挥中心，构建全方位、多层次的校园安全防护体系，为师生营造安全的学习生活环境。",
        scenario: "适用于中小学、高校、幼儿园等教育场景，重点解决校园周界安全、出入口管理、重点区域监控、突发事件处置等问题。",
        architecture: "前端感知（摄像机/报警柱/门禁）→ 智能分析（人脸/行为识别）→ 安防综合管理平台 → 应急指挥与移动端联动",
        values: ["重点区域 24 小时智能值守", "异常事件自动告警推送", "访客出入全程留痕", "应急事件一键联动"],
      },
      {
        name: "企业数字化监控解决方案", industry: "智能制造",
        intro: "面向制造企业的生产可视化与设备联网监控方案，让生产数据实时在线、设备状态一目了然。",
        detail: "企业数字化监控解决方案通过对生产设备、产线、能耗的数据采集与联网，构建企业数字化监控平台，实现生产进度可视化、设备状态实时监控、能耗精细化管理与异常自动告警，助力制造企业降本增效、数字化转型。",
        scenario: "适用于生产制造、仓储物流、能源化工等企业场景，解决设备孤岛、生产黑箱、能耗浪费、故障响应慢等痛点。",
        architecture: "设备层（PLC/传感器/网关）→ 边缘计算（协议解析/数据清洗）→ 监控平台（实时监控/告警/报表）→ 管理应用（移动端/大屏）",
        values: ["设备联网率提升至 95%", "故障响应时间缩短 70%", "能耗数据精细到工序", "生产报表自动生成"],
      },
    ];
    const stmt = db.prepare(
      `INSERT INTO solutions (name, industry, cover, images, intro, detail, scenario, architecture, value_points, related_products, related_cases, status, sort, seo_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    );
    for (let i = 0; i < sols.length; i++) {
      const s = sols[i];
      await stmt.run(s.name, s.industry, "", JSON.stringify([]), s.intro, s.detail, s.scenario, s.architecture,
        JSON.stringify(s.values), JSON.stringify([]), JSON.stringify([]), i + 1, s.name);
    }
  }

  // ---------- 案例分类与案例 ----------
  if ((await count("case_categories")) === 0) {
    const cstmt = db.prepare("INSERT INTO case_categories (name, sort) VALUES (?, ?)");
    for (let i = 0; i < 4; i++) {
      await cstmt.run(["智慧园区", "智慧教育", "智慧安防", "企业数字化"][i], i + 1);
    }

    const catIds = await db.prepare("SELECT id, name FROM case_categories").all();
    const catMap = Object.fromEntries(catIds.map((c) => [c.name, c.id]));
    const stmt = db.prepare(
      `INSERT INTO cases (category_id, name, cover, images, intro, detail, tags, results, related_products, related_solutions, status, sort, seo_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    );
    const cases = [
      {
        cat: "智慧园区", name: "昆明某高新技术产业园区智慧化建设项目",
        intro: "为该园区建设覆盖安防、通行、能耗、信息发布的一体化智慧管理平台，实现园区运营数字化。",
        detail: "本项目为园区建设了以驰耀物联云平台为核心的智慧管理系统，部署高清摄像机 600+ 路、门禁点位 120 个、能耗监测点 200+ 个，并建设园区运营指挥中心。项目实现了园区安防统一管理、访客线上预约、能耗精细化统计与信息一键发布。",
        tags: ["智慧园区", "安防监控", "物联网平台"],
        results: [["600+", "高清监控点位"], ["120", "门禁管理点位"], ["40%", "能耗同比节约"], ["7×24", "全天候智能值守"]],
      },
      {
        cat: "智慧教育", name: "云南某高校平安校园安防系统工程",
        intro: "为高校建设覆盖教学区、宿舍区、图书馆等重点区域的平安校园安防体系。",
        detail: "项目为高校建设了以视频监控为核心，融合人脸识别、入侵报警、访客管理、电子巡查的安防体系，覆盖全校 32 栋建筑，部署智能摄像机 800+ 路。通过 AI 智能分析实现重点区域 24 小时值守与异常事件自动告警，全面提升了校园安全防范能力。",
        tags: ["智慧教育", "人脸识别", "安防监控"],
        results: [["800+", "智能监控点位"], ["32", "栋建筑覆盖"], ["100%", "重点区域覆盖"], ["<30s", "告警响应时间"]],
      },
      {
        cat: "企业数字化", name: "云南某制造企业数字化监控与设备联网项目",
        intro: "帮助制造企业实现生产设备联网与可视化监控，打通生产数据链路。",
        detail: "项目为该制造企业 3 条核心产线的 86 台设备进行联网改造，部署边缘计算网关采集设备运行数据，建设企业数字化监控平台，实现生产进度、设备状态、能耗数据的实时可视化，并通过告警联动大幅缩短了故障响应时间。",
        tags: ["智能制造", "设备联网", "数据可视化"],
        results: [["86", "台设备联网"], ["3", "条产线覆盖"], ["95%", "设备联网率"], ["70%", "故障响应提速"]],
      },
    ];
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      await stmt.run(catMap[c.cat], c.name, "", JSON.stringify([]), c.intro, c.detail,
        JSON.stringify(c.tags), JSON.stringify(c.results), JSON.stringify([]), JSON.stringify([]), i + 1, c.name);
    }
  }

  // ---------- 下载分类与资料 ----------
  if ((await count("download_categories")) === 0) {
    const cstmt = db.prepare("INSERT INTO download_categories (name, sort) VALUES (?, ?)");
    const dlCatNames = ["驱动程序", "固件升级", "使用手册", "SDK 开发包", "技术文档"];
    for (let i = 0; i < dlCatNames.length; i++) await cstmt.run(dlCatNames[i], i + 1);

    const catIds = await db.prepare("SELECT id, name FROM download_categories").all();
    const catMap = Object.fromEntries(catIds.map((c) => [c.name, c.id]));
    const stmt = db.prepare(
      `INSERT INTO downloads (category_id, name, icon, intro, detail, version, files, size, update_log, system_require, related_products, status, sort, seo_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    );
    const dls = [
      {
        cat: "使用手册", name: "驰耀物联云平台使用手册", icon: "doc",
        intro: "驰耀物联云平台完整使用手册，涵盖平台注册、设备接入、数据管理、规则引擎配置等内容。",
        detail: "本手册面向平台管理员与开发者，系统介绍驰耀物联云平台的功能模块与操作流程，包括设备接入指引、规则引擎配置、告警联动设置、数据大屏搭建等章节，并附常见问题解答。",
        version: "V3.0.2", files: [["驰耀物联云平台使用手册.pdf", "PDF", "12.8MB"]],
        size: "12.8MB", update_log: "2024-11-20 更新：补充设备接入协议章节",
        system_require: "支持 Windows / macOS / Linux，建议使用 Chrome、Edge 等现代浏览器",
      },
      {
        cat: "驱动程序", name: "网络摄像机 Windows 客户端驱动", icon: "camera",
        intro: "网络摄像机 Windows 客户端安装程序，支持设备搜索、预览、回放与参数配置。",
        detail: "该客户端用于网络摄像机的日常管理与配置，支持自动搜索局域网设备、多路预览、录像回放、云台控制与参数修改。",
        version: "V1.8.0", files: [["CY_IPC_Win_Client_v1.8.0.zip", "ZIP", "56.3MB"]],
        size: "56.3MB", update_log: "2024-12-01 更新：修复设备搜索偶发失败问题",
        system_require: "Windows 10/11 (64位)，4GB 以上内存",
      },
      {
        cat: "固件升级", name: "边缘计算智能网关固件包", icon: "chip",
        intro: "边缘计算智能网关 CY-EG200 固件升级包，优化协议解析性能并新增断网续传能力。",
        detail: "本固件适用于 CY-EG200 边缘计算智能网关，升级后新增 5G 网络支持、断网续传增强与协议解析性能优化。升级前请备份配置文件。",
        version: "V2.4.1", files: [["CY-EG200_FW_V2.4.1.img", "IMG", "48.2MB"]],
        size: "48.2MB", update_log: "2024-12-10 发布：新增断网续传增强功能",
        system_require: "适用于 CY-EG200 网关硬件，通过 Web 管理界面升级",
      },
      {
        cat: "SDK 开发包", name: "驰耀物联网开放平台 SDK (Java)", icon: "code",
        intro: "Java 版开放平台 SDK，提供设备管理、数据上报、命令下发等接口封装，快速接入业务系统。",
        detail: "Java SDK 封装了驰耀物联网开放平台的核心 API，支持设备注册、数据上报订阅、命令下发、告警回调等功能，提供完整示例代码与 API 文档。",
        version: "V2.1.0", files: [["chiyao-iot-sdk-java-v2.1.0.zip", "ZIP", "3.6MB"], ["chiyao-iot-openapi-javadoc.pdf", "PDF", "2.1MB"]],
        size: "5.7MB", update_log: "2024-11-05 发布：支持 JDK 8+ 与 Spring Boot 集成",
        system_require: "JDK 8+，Maven 3.6+",
      },
      {
        cat: "SDK 开发包", name: "驰耀物联网开放平台 SDK (Python)", icon: "code",
        intro: "Python 版开放平台 SDK，支持异步接口，适用于数据采集与自动化脚本场景。",
        detail: "Python SDK 基于 asyncio 实现，支持异步设备数据上报、命令下发与告警处理，提供清晰的类型提示与文档。",
        version: "V1.9.0", files: [["chiyao-iot-sdk-python-v1.9.0.tar.gz", "TAR.GZ", "2.4MB"]],
        size: "2.4MB", update_log: "2024-10-18 发布：新增异步批量查询接口",
        system_require: "Python 3.8+，支持 pip 安装",
      },
      {
        cat: "技术文档", name: "驰耀物联网平台设备接入协议文档", icon: "doc",
        intro: "面向设备厂商与开发者的设备接入协议规范文档，详细说明 MQTT/HTTP 接入流程与数据格式。",
        detail: "本文档详细定义设备接入驰耀物联网平台的协议规范，包括设备认证、消息主题、数据报文格式、上下线机制与错误码说明，是设备接入开发的必备参考资料。",
        version: "V1.6.0", files: [["chiyao-iot-protocol-spec-v1.6.0.pdf", "PDF", "8.9MB"]],
        size: "8.9MB", update_log: "2024-11-28 更新：补充 5G 模组接入章节",
        system_require: "无特殊要求",
      },
    ];
    for (let i = 0; i < dls.length; i++) {
      const d = dls[i];
      await stmt.run(catMap[d.cat], d.name, d.icon, d.intro, d.detail, d.version,
        JSON.stringify(d.files), d.size, d.update_log, d.system_require, JSON.stringify([]), i + 1, d.name);
    }
  }

  // ---------- 新闻资讯 ----------
  if ((await count("articles")) === 0) {
    const arts = [
      ["company", "云南驰耀科技有限公司顺利通过 ISO9001 质量管理体系认证", "company",
        "公司顺利通过 ISO9001 质量管理体系认证，标志着公司在质量管理与规范运营方面迈上新台阶。",
        "近日，云南驰耀科技有限公司顺利通过 ISO9001 质量管理体系认证评审，认证范围覆盖物联网产品研发、系统集成与技术服务全流程。\n\n此次认证的通过，是公司持续加强质量管理体系建设的重要成果，也是对公司规范化运营能力的权威认可。公司将以通过认证为契机，进一步优化产品研发与项目实施流程，为客户提供更高质量的产品与服务。",
        ["企业动态"], "驰耀科技", 1],
      ["tech", "边缘计算在智慧园区场景中的应用实践", "tech",
        "边缘计算让数据在靠近源头的地方被处理，大幅降低网络压力与响应延迟，本文分享在智慧园区中的落地实践。",
        "在智慧园区场景中，海量摄像头、传感器产生的数据如果全部上传云端处理，将带来巨大的网络带宽压力与响应延迟。边缘计算通过将数据处理下沉到靠近数据源头的边缘节点，实现了数据的本地化处理与快速响应。\n\n在驰耀科技承建的园区项目中，我们部署了边缘计算网关，在本地完成视频结构化分析、设备数据清洗与规则判断，仅将关键结果上报云端平台。实践表明，边缘计算使园区告警响应时间缩短 60% 以上，同时显著降低了云端算力与带宽成本。\n\n未来，随着 5G 与 AI 芯片的成熟，边缘计算将与云端 AI 形成更紧密的协同，推动智慧园区向更高水平的智能化演进。",
        ["技术分享"], "技术中心", 2],
      ["news", "驰耀科技与多家生态伙伴达成战略合作，共建物联网生态", "news",
        "公司近期与多家行业伙伴签署战略合作协议，共同推进物联网与智慧化解决方案的落地应用。",
        "为进一步拓展物联网产业生态，云南驰耀科技近期与多家行业伙伴达成战略合作，合作范围覆盖硬件终端、云服务、行业应用等多个领域。\n\n各方将依托各自在技术、产品与渠道方面的优势，围绕智慧园区、智慧校园、智慧安防等重点行业场景开展深度合作，共同打造更具竞争力的联合解决方案，为客户创造更大价值。",
        ["行业资讯"], "市场部", 3],
      ["company", "驰耀科技圆满完成昆明某智慧园区项目交付验收", "company",
        "公司承建的昆明某高新技术产业园区智慧化建设项目顺利通过验收，正式投入运营。",
        "近日，由云南驰耀科技承建的昆明某高新技术产业园区智慧化建设项目顺利通过专家组验收，正式投入运营。\n\n项目历时 6 个月，完成了园区安防监控、智能通行、能耗管理、信息发布等子系统建设，并部署了园区智慧管理平台。项目投入运营后，园区安防管理效率与运营数字化水平得到显著提升，获得了园区管理方的一致好评。",
        ["企业动态"], "项目部", 4],
      ["tech", "多协议融合：物联网设备接入的技术演进", "tech",
        "从 MQTT 到 CoAP、从私有协议到统一物模型，物联网设备接入技术正在走向多协议融合。",
        "物联网设备接入是物联网平台的核心基础能力。早期物联网系统多采用厂商私有协议，导致设备难以互通、平台难以扩展。随着行业标准化进程推进，MQTT、CoAP、HTTP 等标准协议逐渐成为主流。\n\n驰耀物联网云平台采用多协议接入架构，同时支持 MQTT、CoAP、HTTP 与主流厂商私有协议，并通过统一物模型屏蔽协议差异，使上层应用无需关心设备接入细节。平台还提供协议插件机制，支持新协议的快速扩展接入。\n\n多协议融合既是技术趋势，也是现实需求。统一的设备接入能力，将帮助企业更灵活地构建自己的物联网应用。",
        ["技术分享"], "技术中心", 5],
      ["news", "政策解读：新基建驱动下智慧园区建设的市场机遇", "news",
        "新型基础设施建设持续推进，智慧园区作为数字经济的重要载体迎来新的发展机遇。",
        "随着新型基础设施建设的持续推进，智慧园区建设进入快速发展期。国家层面相继出台多项政策，支持园区数字化、智能化转型，为相关产业链企业带来广阔市场空间。\n\n从需求侧看，园区运营方对安防升级、能耗管理、智慧通行、运营效率提升的需求日益迫切；从供给侧看，物联网、AI、大数据等技术的成熟为智慧园区落地提供了坚实支撑。\n\n驰耀科技将持续深耕智慧园区赛道，以「平台+生态」的战略思路，与合作伙伴共同服务园区数字化转型。",
        ["行业资讯"], "市场部", 6],
    ];
    const stmt = db.prepare(
      `INSERT INTO articles (category, title, cover, summary, content, tags, author, is_top, status, publish_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    );
    for (let i = 0; i < arts.length; i++) {
      const a = arts[i];
      const publish = new Date(Date.now() - (i + 1) * 3 * 86400000).toISOString().slice(0, 19).replace("T", " ");
      await stmt.run(a[0], a[1], "", a[3], a[4], JSON.stringify(a[5]), a[6], i === 0 ? 1 : 0, publish);
    }
  }

  // ---------- 关于我们 ----------
  if ((await count("about_us")) === 0) {
    await db.prepare(
      `INSERT INTO about_us (title, intro, content, history, honors, team)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      "关于我们",
      "云南驰耀科技有限公司以物联网平台、智慧化解决方案、安防监控与信息化系统集成为核心业务方向，业务覆盖产品研发、方案设计与项目实施交付。",
      "云南驰耀科技有限公司成立于昆明，是一家专注于物联网与智慧化解决方案的科技型企业。公司以「智慧物联 · 科技赋能」为使命，聚焦物联网平台研发、安防监控系统建设、智慧化解决方案设计与信息化系统集成服务。\n\n公司拥有专业的研发与项目实施团队，具备从需求分析、方案设计、产品研发到项目实施交付的全链条服务能力。公司自主研发的驰耀物联云平台与系列智能硬件产品，已在智慧园区、智慧校园、智慧安防等多个行业落地应用，获得了客户的广泛认可。\n\n驰耀科技始终秉持「客户第一、品质至上、创新驱动」的经营理念，坚持以技术创新为核心竞争力，持续为客户创造价值。",
      JSON.stringify([
        { year: "2019", title: "公司成立", desc: "云南驰耀科技有限公司在昆明正式成立，专注信息化系统集成业务。" },
        { year: "2020", title: "进军安防监控", desc: "组建安防监控事业部，承接园区、校园安防工程建设项目。" },
        { year: "2021", title: "自主研发启动", desc: "启动物联网平台与智能硬件产品的自主研发，布局核心产品线。" },
        { year: "2022", title: "平台产品发布", desc: "驰耀物联云平台 V1.0 正式发布，首个私有化项目落地。" },
        { year: "2023", title: "智慧方案深耕", desc: "形成智慧园区、智慧校园、智慧安防等行业解决方案体系。" },
        { year: "2024", title: "规模增长", desc: "完成 ISO9001 认证，服务客户覆盖西南地区多个行业。" },
      ]),
      JSON.stringify([
        { name: "ISO9001", desc: "质量管理体系认证", icon: "award" },
        { name: "高新技术企业", desc: "国家级高新技术企业", icon: "award" },
        { name: "AAA信用企业", desc: "企业信用评价AAA级", icon: "shield" },
        { name: "软件著作权", desc: "多项软件产品登记", icon: "code" },
      ]),
      JSON.stringify([
        { name: "研发中心", desc: "物联网平台与硬件研发团队 20+ 人", icon: "cpu" },
        { name: "项目实施", desc: "资深项目经理与实施工程师团队", icon: "tool" },
        { name: "技术支持", desc: "7×24 小时技术支持与运维服务", icon: "headphones" },
      ])
    );
  }

  // ---------- 首页设置 ----------
  if ((await count("homepage_settings")) === 0) {
    await db.prepare(
      `INSERT INTO homepage_settings (capability_title, capability_desc, capabilities, partners, contact_banner_title, contact_banner_desc)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      "核心能力",
      "从产品研发到方案落地，构建端到端的智慧化服务能力",
      JSON.stringify([
        { title: "产品研发", desc: "物联网平台与智能硬件自主研发", icon: "cpu", num: 30, suffix: "+", label: "自研产品与技术" },
        { title: "方案设计", desc: "行业场景化解决方案深度定制", icon: "layout", num: 20, suffix: "+", label: "行业解决方案" },
        { title: "实施交付", desc: "标准化项目流程与质量管控", icon: "tool", num: 100, suffix: "+", label: "交付项目案例" },
        { title: "运维服务", desc: "7×24 小时全天候技术保障", icon: "headphones", num: 7, suffix: "×24", label: "小时响应保障" },
      ]),
      JSON.stringify([
        { name: "海康威视", icon: "shield" },
        { name: "华为云", icon: "cloud" },
        { name: "大华股份", icon: "camera" },
        { name: "阿里云", icon: "cloud" },
        { name: "宇视科技", icon: "eye" },
        { name: "中兴通讯", icon: "signal" },
      ]),
      "开启智慧物联合作",
      "无论您是产品咨询、方案设计还是项目实施需求，欢迎随时与我们联系，我们将在 24 小时内响应。"
    );
  }

  // ---------- 演示留言 ----------
  if ((await count("messages")) === 0) {
    const stmt = db.prepare(
      `INSERT INTO messages (name, phone, email, subject, content, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const now = Date.now();
    const msgs = [
      ["张经理", "13987654321", "zhang@example.com", "智慧园区方案咨询", "我们园区正在做智慧化改造规划，想了解贵公司智慧园区解决方案的详细内容。", "pending"],
      ["李工", "13712345678", "li@example.com", "物联网平台合作", "我司正在选型物联网平台，希望获取平台白皮书与演示环境。", "processing"],
      ["王老师", "13555556666", "wang@example.com", "校园安防项目", "学校计划建设平安校园安防系统，请提供方案建议书与报价参考。", "done"],
    ];
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const created = new Date(now - (i + 1) * 2 * 86400000).toISOString().slice(0, 19).replace("T", " ");
      await stmt.run(...m, created);
    }
    await db.prepare("UPDATE messages SET reply = ?, replied_at = ? WHERE subject = ?")
      .run("感谢您的咨询！已安排销售工程师与您联系，请保持电话畅通。", new Date(now - 1 * 86400000).toISOString().slice(0, 19).replace("T", " "), "校园安防项目");
  }

  console.log("✅ 数据库种子数据初始化完成");
}

// 直接运行 seed.js 时执行
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace("file://", ""))) {
  seed().catch((e) => {
    console.error("[seed] 初始化失败:", e.message);
    process.exit(1);
  });
}