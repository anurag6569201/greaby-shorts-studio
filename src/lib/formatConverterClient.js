// src/lib/formatConverterClient.js

const srtTimeFormat = (seconds) => {
    if (seconds < 0) seconds = 0;
    const date = new Date(0);
    date.setSeconds(seconds);
    const timeStr = date.toISOString().substr(11, 12);
    return timeStr.replace('.', ',');
};

const TICKS_PER_SECOND = 10_000_000;

export const to_plain_text = (result_json) => {
    try {
        const fullText = result_json.recognizedPhrases
            .map(p => p.nBest[0].display)
            .join(' ');
        return fullText || "Transcription result was empty.";
    } catch (e) {
        return "Error: Could not parse transcription data.";
    }
};

export const to_srt = (result_json) => {
    try {
        const phrases = result_json.recognizedPhrases;
        if (!phrases || phrases.length === 0) return "1\n00:00:00,000 --> 00:00:05,000\nNo recognized phrases found.";

        const srtContent = phrases.map((phrase, i) => {
            const bestChoice = phrase.nBest[0];
            let text = bestChoice.display.trim();
            const startSeconds = phrase.offsetInTicks / TICKS_PER_SECOND;
            const endSeconds = (phrase.offsetInTicks + phrase.durationInTicks) / TICKS_PER_SECOND;
            
            if (phrase.speaker) {
                text = `${phrase.speaker}: ${text}`;
            }

            const startTime = srtTimeFormat(startSeconds);
            const endTime = srtTimeFormat(endSeconds);
            
            return `${i + 1}\n${startTime} --> ${endTime}\n${text}\n`;
        });
        
        return srtContent.join('\n');
    } catch (e) {
        return `1\n00:00:00,000 --> 00:00:05,000\nError: Could not parse data to SRT. Details: ${e.message}`;
    }
};