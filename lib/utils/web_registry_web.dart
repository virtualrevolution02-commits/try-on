// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

void registerWebARView() {
  ui_web.platformViewRegistry.registerViewFactory('ar-canvas-view', (int viewId) {
    var div = html.document.getElementById('ar-canvas-container');
    if (div != null) {
      div.style.display = 'block';
      div.style.position = 'absolute';
      div.style.zIndex = '0';
      return div;
    }
    return html.DivElement();
  });
}
