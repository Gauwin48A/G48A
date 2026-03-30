const pino=require("pino");const baseOptions={level:process.env.LOG_LEVEL||"info"};const logger=pino(baseOptions);module.exports=logger;
