import asyncio
import logging
import os

from livekit import api, rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobExecutorType,
    JobProcess,
    WorkerOptions,
    cli,
)
from livekit.agents.vad import VADEventType
from livekit.plugins import silero

logger = logging.getLogger("livekit-vad")


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext) -> None:
    vad: silero.VAD = ctx.proc.userdata["vad"]
    lkapi = api.LiveKitAPI()

    async def watch_track(track: rtc.Track, participant: rtc.RemoteParticipant) -> None:
        stream = vad.stream()

        async def forward_frames() -> None:
            async for event in rtc.AudioStream(track):
                stream.push_frame(event.frame)
            stream.end_input()

        forward_task = asyncio.create_task(forward_frames())
        try:
            async for event in stream:
                if event.type not in (VADEventType.START_OF_SPEECH, VADEventType.END_OF_SPEECH):
                    continue
                speaking = event.type == VADEventType.START_OF_SPEECH
                try:
                    await lkapi.room.update_participant(
                        api.UpdateParticipantRequest(
                            room=ctx.room.name,
                            identity=participant.identity,
                            attributes={"vad.speaking": "true" if speaking else "false"},
                        )
                    )
                except Exception:
                    logger.exception("failed to update attributes for %s", participant.identity)
        finally:
            forward_task.cancel()
            await stream.aclose()

    @ctx.room.on("track_subscribed")
    def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            asyncio.create_task(watch_track(track, participant))

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            port=int(os.environ.get("VAD_HTTP_PORT", "8081")),
            # Silero VAD inference is a lightweight ONNX call, not a heavy
            # CPU-bound job needing full process isolation — run jobs as
            # threads in the single worker process instead of forking a
            # separate Python interpreter (with its own copy of onnxruntime
            # + av) per job. Also drop the default idle pool (4 in
            # production mode) down to 1: this worker only needs to be able
            # to pick up the next job promptly, not run many in parallel.
            job_executor_type=JobExecutorType.THREAD,
            num_idle_processes=1,
        )
    )
