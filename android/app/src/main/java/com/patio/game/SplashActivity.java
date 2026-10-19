package com.patio.game;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.Window;
import android.widget.FrameLayout;
import android.widget.ImageView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public final class SplashActivity extends Activity {
    private static final long SPLASH_DURATION_MS = 3_000L;
    private static final long TITLE_FADE_MS = 1_500L;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private ValueAnimator titleAnimator;
    private ValueAnimator progressAnimator;
    private SplashOverlayView overlay;

    private final Runnable openGame = () -> {
        startActivity(new Intent(this, MainActivity.class));
        finish();
        overridePendingTransition(0, 0);
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        FrameLayout splash = new FrameLayout(this);
        splash.setBackgroundColor(Color.rgb(13, 13, 18));

        ImageView background = new ImageView(this);
        background.setImageResource(R.drawable.uknwlab_splash);
        background.setScaleType(ImageView.ScaleType.CENTER_CROP);
        background.setContentDescription("Panorama noturno da cidade");
        splash.addView(background, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        overlay = new SplashOverlayView(this);
        overlay.setContentDescription("UKNWLAB apresenta Noir City. Carregando.");
        splash.addView(overlay, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        setContentView(splash);

        enterImmersiveMode();
        startSplashAnimations();
        playStartupSound();
        handler.postDelayed(openGame, SPLASH_DURATION_MS);
    }

    private void startSplashAnimations() {
        titleAnimator = ValueAnimator.ofFloat(0f, 1f);
        titleAnimator.setDuration(TITLE_FADE_MS);
        titleAnimator.setInterpolator(new AccelerateDecelerateInterpolator());
        titleAnimator.addUpdateListener(animation -> {
            if (overlay != null) overlay.setTitleAlpha((float) animation.getAnimatedValue());
        });
        titleAnimator.start();

        progressAnimator = ValueAnimator.ofFloat(0f, 1f);
        progressAnimator.setDuration(SPLASH_DURATION_MS);
        progressAnimator.setInterpolator(new android.view.animation.LinearInterpolator());
        progressAnimator.addUpdateListener(animation -> {
            if (overlay != null) overlay.setProgress((float) animation.getAnimatedValue());
        });
        progressAnimator.start();
    }

    private void enterImmersiveMode() {
        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(13, 13, 18));
        window.setNavigationBarColor(Color.rgb(13, 13, 18));
        WindowCompat.setDecorFitsSystemWindows(window, false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    private void playStartupSound() {
        player = MediaPlayer.create(this, R.raw.noir_startup_8bit);
        if (player == null) return;
        player.setVolume(0.72f, 0.72f);
        player.setOnCompletionListener(completed -> {
            completed.release();
            if (player == completed) player = null;
        });
        player.start();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(openGame);
        if (titleAnimator != null) titleAnimator.cancel();
        if (progressAnimator != null) progressAnimator.cancel();
        if (player != null) {
            player.release();
            player = null;
        }
        super.onDestroy();
    }

    private static final class SplashOverlayView extends View {
        private static final int GOLD = Color.rgb(229, 177, 104);
        private final Paint titlePaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        private final Paint subtitlePaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        private final Paint ornamentPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint progressPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private float titleAlpha;
        private float progress;

        SplashOverlayView(Activity activity) {
            super(activity);
            titlePaint.setColor(GOLD);
            titlePaint.setTextAlign(Paint.Align.CENTER);
            titlePaint.setTypeface(Typeface.create("serif", Typeface.BOLD));
            subtitlePaint.setColor(Color.rgb(224, 205, 174));
            subtitlePaint.setTextAlign(Paint.Align.CENTER);
            subtitlePaint.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
            ornamentPaint.setColor(GOLD);
            ornamentPaint.setAlpha(170);
            trackPaint.setColor(Color.WHITE);
            trackPaint.setAlpha(72);
            progressPaint.setColor(GOLD);
        }

        void setTitleAlpha(float alpha) {
            titleAlpha = Math.max(0f, Math.min(1f, alpha));
            invalidate();
        }

        void setProgress(float value) {
            progress = Math.max(0f, Math.min(1f, value));
            invalidate();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            float width = getWidth();
            float height = getHeight();
            if (width <= 0f || height <= 0f) return;

            float centerX = width / 2f;
            ornamentPaint.setStrokeWidth(Math.max(1f, width * 0.0022f));
            canvas.drawLine(centerX - width * 0.085f, height * 0.315f,
                centerX + width * 0.085f, height * 0.315f, ornamentPaint);

            titlePaint.setTextSize(width * 0.115f);
            titlePaint.setAlpha(Math.round(titleAlpha * 255f));
            drawTrackedText(canvas, "UKNWLAB", titlePaint, centerX, height * 0.365f, width * 0.018f);

            subtitlePaint.setTextSize(width * 0.019f);
            subtitlePaint.setAlpha(Math.round(titleAlpha * 220f));
            drawTrackedText(canvas, "APRESENTA", subtitlePaint, centerX, height * 0.392f, width * 0.018f);

            float barWidth = width * 0.28f;
            float barHeight = Math.max(3f, width * 0.006f);
            float barTop = height * 0.68f;
            RectF track = new RectF(centerX - barWidth / 2f, barTop,
                centerX + barWidth / 2f, barTop + barHeight);
            float radius = barHeight / 2f;
            canvas.drawRoundRect(track, radius, radius, trackPaint);
            RectF fill = new RectF(track.left, track.top,
                track.left + barWidth * progress, track.bottom);
            if (progress > 0f) canvas.drawRoundRect(fill, radius, radius, progressPaint);
        }

        private static void drawTrackedText(Canvas canvas, String text, Paint paint,
                float centerX, float baseline, float tracking) {
            float textWidth = paint.measureText(text) + tracking * Math.max(0, text.length() - 1);
            float x = centerX - textWidth / 2f;
            for (int index = 0; index < text.length(); index++) {
                String character = text.substring(index, index + 1);
                canvas.drawText(character, x, baseline, paint);
                x += paint.measureText(character) + tracking;
            }
        }
    }
}
