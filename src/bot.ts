require("dotenv").config();

import commandObject from "./commands";
import ytdl from "ytdl-core";
import ys from "youtube-search";
import { Client, Guild, Message, VoiceConnection } from "discord.js";

const CMD_PREFIX = "#";

const client = new Client();

interface ServerPoolObj {
    connection: VoiceConnection;
    songs: string[];
}

const ServerPool = new Map<string, ServerPoolObj>();

client.on("message", async (msg) => {
    if (msg.content.startsWith(CMD_PREFIX)) {
        const [CMD] = msg.content.trim().substring(CMD_PREFIX.length).split(/\s+/);

        let Server: ServerPoolObj | undefined = ServerPool.get(msg.guild!.id.toString()!);

        if (CMD === "commands") {
            returnCommands(msg);
            return;
        }

        if (CMD === "play") {
            executePlay(msg);
            return;
        }

        if (CMD === "pause") {
            if (Server) {
                Server.connection.dispatcher.pause();
                msg.channel.send("⏸ Die Wiedergabe wurde pausiert.");
            }
            return;
        }

        if (CMD === "resume") {
            if (Server) {
                Server.connection.dispatcher.resume();
                msg.channel.send("▶️ Die Wiedergabe wurde gestartet.");
            }
            return;
        }

        if (CMD === "skip") {
            skip(msg.guild!, msg);
            return;
        }

        if (CMD === "leave") {
            msg.member?.voice.channel?.leave();
            return;
        }

        function returnCommands(msg: Message) {
            let commands: string[] = [];
            let descriptions: string[] = [];

            Object.keys(commandObject).forEach((el) => {
                commands.push(el);
            });
            Object.values(commandObject).forEach((el) => {
                descriptions.push(el);
            });

            const message = commands
                .map((el, i) => {
                    return `${el}: ${descriptions[i]}`;
                })
                .join("\n");

            return msg.reply("hier sind die verfügbaren Commands:\n" + message);
        }

        async function executePlay(msg: Message) {
            const [_, ...args] = msg.content.trim().substring(CMD_PREFIX.length).split(/\s+/);

            if (!args[0]) return;

            if (!Server || Server?.connection.channel.id !== msg.member?.voice.channelID) {
                const conn = await msg.member?.voice.channel?.join();

                ServerPool.set(msg.guild?.id.toString()!, {
                    connection: conn!,
                    songs: [],
                });

                Server = ServerPool.get(msg.guild!.id.toString()!);
            }

            if (args[0].includes("https://www.youtube.com/watch")) {
                if (Server!.songs.length > 0) {
                    const info = await ytdl.getInfo(args[0]);
                    Server!.songs.push(args[0]);
                    msg.channel.send(`▶️ ${info.videoDetails.title} wurde zur Wiedergabeliste hinzugefügt!`);
                } else {
                    Server!.songs.push(args[0]);
                    const info = await ytdl.getInfo(args[0]);
                    play(msg.guild!, Server!.songs[0], msg);
                    msg.channel.send(`▶️ ${info.videoDetails.title} wird nun abgespielt.`);
                }
            } else {
                if (Server!.songs.length > 0) {
                    ys(
                        args.join(" "),
                        {
                            maxResults: 1,
                            key: process.env.YOUTUBE_API_KEY,
                        },
                        async (err, res) => {
                            if (err) {
                                msg.channel.send("Es konnte nichts mit dem Titel '" + args.join(" ") + "' gefunden werden.");
                            } else {
                                Server!.songs.push(res![0].link);
                                msg.channel.send(`▶️ ${res![0].title} wurde zur Wiedergabeliste hinzugefügt!`);
                            }
                        }
                    );
                } else {
                    ys(
                        args.join(" "),
                        {
                            maxResults: 1,
                            key: process.env.YOUTUBE_API_KEY,
                        },
                        async (err, res) => {
                            if (err) {
                                msg.channel.send("Es konnte nichts mit dem Titel '" + args.join(" ") + "' gefunden werden.");
                            } else {
                                Server!.songs.push(res![0].link);
                                play(msg.guild!, Server!.songs[0], msg);
                            }
                        }
                    );
                }
            }
        }

        async function play(guild: Guild, song: string, msg: Message) {
            const server = ServerPool.get(guild.id);
            if (!song) {
                msg.member?.voice.channel?.leave();
                ServerPool.delete(guild.id);
                return;
            }

            const info = await ytdl.getInfo(server?.songs[0]!);

            server?.connection.play(ytdl(server.songs[0], { quality: "lowestaudio", filter: "audioonly" }), { volume: 0.75 }).on("finish", () => {
                server.songs.shift();
                play(guild, server.songs[0], msg);
            });
            msg.channel.send(`▶️ ${info.videoDetails.title} wird nun abgespielt.`);
        }

        async function skip(guild: Guild, msg: Message) {
            const server = ServerPool.get(guild.id);
            server?.songs.shift();
            play(guild, server!.songs[0], msg);
        }
    } else {
        return;
    }
});

client.login(process.env.DISCORD_BOT_ACCESS_TOKEN);
