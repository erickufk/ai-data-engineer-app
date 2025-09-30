export const dummyConfigurations = {
  // Источники данных
  postgresql: {
    host: "localhost",
    port: "5432",
    database: "analytics_db",
    schema: "public",
    table: "user_events",
    username: "postgres",
    password: "password123",
    timezone: "UTC",
    ssl: "false",
  },
  mysql: {
    host: "localhost",
    port: "3306",
    database: "ecommerce",
    table: "orders",
    username: "root",
    password: "mysql123",
    charset: "utf8mb4",
    timezone: "UTC",
  },
  mongodb: {
    connectionString: "mongodb://localhost:27017",
    database: "analytics",
    collection: "user_sessions",
    username: "mongo_user",
    password: "mongo123",
    authDatabase: "admin",
  },
  kafka: {
    bootstrapServers: "localhost:9092",
    topic: "user-events-stream",
    consumerGroup: "analytics-consumer",
    keyField: "user_id",
    valueFormat: "JSON",
    startingOffset: "latest",
    securityProtocol: "PLAINTEXT",
  },
  redis: {
    host: "localhost",
    port: "6379",
    database: "0",
    password: "redis123",
    keyPattern: "user:*:events",
    dataType: "hash",
  },
  elasticsearch: {
    host: "localhost",
    port: "9200",
    index: "application-logs",
    username: "elastic",
    password: "elastic123",
    ssl: "false",
    apiKey: "",
  },
  file: {
    format: "CSV",
    path: "/data/input/sample_events.csv",
    delimiter: ",",
    encoding: "utf-8",
    hasHeader: "true",
    compression: "none",
  },
  s3: {
    bucket: "analytics-data-bucket",
    region: "us-east-1",
    prefix: "events/year=2024/",
    format: "parquet",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  },
  api: {
    endpoint: "https://api.example.com/v1/events",
    method: "GET",
    headers: '{"Authorization": "Bearer token123", "Content-Type": "application/json"}',
    queryParams: '{"limit": 1000, "offset": 0}',
    authentication: "bearer",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  },

  // Цели данных
  clickhouse: {
    host: "localhost",
    port: "8123",
    database: "analytics",
    table: "events_aggregated",
    username: "default",
    password: "clickhouse123",
    orderBy: "event_time, user_id",
    partitionBy: "toYYYYMM(event_time)",
  },
  snowflake: {
    account: "xy12345.us-east-1",
    warehouse: "COMPUTE_WH",
    database: "ANALYTICS_DB",
    schema: "PUBLIC",
    table: "USER_EVENTS",
    username: "snowflake_user",
    password: "snow123",
    role: "ANALYST",
  },
  bigquery: {
    projectId: "my-analytics-project",
    dataset: "analytics",
    table: "user_events",
    location: "US",
    serviceAccountKey: '{"type": "service_account", "project_id": "my-project"}',
    writeDisposition: "WRITE_APPEND",
  },
  redshift: {
    host: "redshift-cluster.abc123.us-east-1.redshift.amazonaws.com",
    port: "5439",
    database: "analytics",
    schema: "public",
    table: "user_events",
    username: "redshift_user",
    password: "redshift123",
    ssl: "true",
  },
  hdfs: {
    namenode: "hdfs://localhost:9000",
    rootPath: "/data/warehouse/",
    relativePath: "events/{YYYY}/{MM}/{DD}/",
    format: "parquet",
    replication: "3",
    blockSize: "128MB",
  },
  databricks: {
    serverHostname: "dbc-12345678-9abc.cloud.databricks.com",
    httpPath: "/sql/1.0/warehouses/abc123def456",
    catalog: "main",
    schema: "analytics",
    table: "user_events",
    accessToken: "dapi1234567890abcdef",
  },
}

export const dummyFieldMappings = {
  "postgresql-clickhouse": [
    { source: "user_id", target: "user_id", transform: "none" },
    { source: "event_name", target: "event_type", transform: "upper" },
    { source: "created_at", target: "event_time", transform: "date_trunc" },
    { source: "event_data", target: "properties", transform: "none" },
    { source: "session_id", target: "session_id", transform: "none" },
    { source: "ip_address", target: "user_ip", transform: "none" },
  ],
  "mysql-bigquery": [
    { source: "id", target: "order_id", transform: "cast_string" },
    { source: "customer_id", target: "customer_id", transform: "none" },
    { source: "order_date", target: "created_at", transform: "none" },
    { source: "total_amount", target: "amount", transform: "cast_float" },
    { source: "status", target: "order_status", transform: "lower" },
  ],
  "kafka-postgresql": [
    { source: "key", target: "user_id", transform: "cast_string" },
    { source: "value", target: "event_data", transform: "none" },
    { source: "timestamp", target: "created_at", transform: "none" },
    { source: "partition", target: "kafka_partition", transform: "cast_int" },
    { source: "offset", target: "kafka_offset", transform: "cast_int" },
  ],
  "mongodb-snowflake": [
    { source: "_id", target: "document_id", transform: "cast_string" },
    { source: "userId", target: "user_id", transform: "none" },
    { source: "sessionStart", target: "session_start_time", transform: "none" },
    { source: "sessionEnd", target: "session_end_time", transform: "none" },
    { source: "pageViews", target: "page_view_count", transform: "cast_int" },
  ],
  "file-hdfs": [
    { source: "timestamp", target: "event_date", transform: "date_trunc" },
    { source: "user_id", target: "user_id", transform: "none" },
    { source: "event_type", target: "event_category", transform: "none" },
    { source: "value", target: "metric_value", transform: "cast_float" },
  ],
  "api-redshift": [
    { source: "id", target: "api_record_id", transform: "cast_string" },
    { source: "timestamp", target: "created_at", transform: "none" },
    { source: "user", target: "user_data", transform: "none" },
    { source: "metrics", target: "performance_metrics", transform: "none" },
  ],
}

export const dummySchedules = {
  streaming: {
    frequency: "streaming",
    description: "Обработка в реальном времени",
    cron: "* * * * *",
    batchSize: "1000",
    maxLatency: "5s",
    checkpointInterval: "10s",
  },
  minute: {
    frequency: "minute",
    description: "Каждую минуту",
    cron: "* * * * *",
    batchSize: "500",
    timeout: "30s",
  },
  hourly: {
    frequency: "hourly",
    description: "Каждый час в 00 минут",
    cron: "0 * * * *",
    batchSize: "10000",
    timeout: "15m",
    retries: "3",
  },
  daily: {
    frequency: "daily",
    description: "Ежедневно в 02:00",
    cron: "0 2 * * *",
    batchSize: "100000",
    timeout: "2h",
    retries: "3",
    alertOnFailure: "true",
  },
  weekly: {
    frequency: "weekly",
    description: "Еженедельно по воскресеньям в 02:00",
    cron: "0 2 * * 0",
    batchSize: "500000",
    timeout: "6h",
    retries: "2",
    alertOnFailure: "true",
  },
  monthly: {
    frequency: "monthly",
    description: "Ежемесячно 1 числа в 03:00",
    cron: "0 3 1 * *",
    batchSize: "2000000",
    timeout: "12h",
    retries: "1",
    alertOnFailure: "true",
  },
}

export const dummyScenarios = {
  "realtime-analytics": {
    name: "Аналитика в реальном времени",
    source: "kafka",
    target: "clickhouse",
    schedule: "streaming",
    description: "Потоковая обработка событий пользователей",
  },
  "batch-etl": {
    name: "Пакетная ETL обработка",
    source: "postgresql",
    target: "snowflake",
    schedule: "daily",
    description: "Ежедневная загрузка данных в хранилище",
  },
  "log-processing": {
    name: "Обработка логов",
    source: "file",
    target: "elasticsearch",
    schedule: "hourly",
    description: "Индексация логов приложения",
  },
  "data-lake": {
    name: "Загрузка в озеро данных",
    source: "api",
    target: "hdfs",
    schedule: "daily",
    description: "Сбор данных из внешних API",
  },
  "ml-pipeline": {
    name: "ML пайплайн",
    source: "mongodb",
    target: "databricks",
    schedule: "weekly",
    description: "Подготовка данных для машинного обучения",
  },
}

export function getDummyConfig(presetId: string): Record<string, string> {
  return dummyConfigurations[presetId as keyof typeof dummyConfigurations] || {}
}

export function getDummyFieldMapping(sourceId: string, targetId: string) {
  const key = `${sourceId}-${targetId}` as keyof typeof dummyFieldMappings
  return dummyFieldMappings[key] || []
}

export function getDummySchedule(type: keyof typeof dummySchedules = "daily") {
  return dummySchedules[type]
}

export function getDummyScenario(scenarioId: keyof typeof dummyScenarios) {
  return dummyScenarios[scenarioId]
}

export function getAllDummyScenarios() {
  return Object.entries(dummyScenarios).map(([id, scenario]) => ({
    id,
    ...scenario,
  }))
}
