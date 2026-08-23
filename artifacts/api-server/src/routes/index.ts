import { Router, type IRouter } from "express";
import healthRouter from "./health";
import registrationsRouter from "./registrations";
import fixturesRouter from "./fixtures";
import matchesRouter from "./matches";
import eventsRouter from "./events";
import tournamentsRouter from "./tournaments";
import setupRouter from "./setup";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/registrations", registrationsRouter);
router.use("/fixtures", fixturesRouter);
router.use("/matches", matchesRouter);
router.use("/events", eventsRouter);
router.use("/tournaments", tournamentsRouter);
router.use("/setup", setupRouter);

export default router;
