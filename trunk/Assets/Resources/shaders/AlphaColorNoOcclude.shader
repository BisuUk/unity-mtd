Shader "Custom/AlphaColorNoOcclude"
{
 Properties 
 {
    _Color ("Color Tint", Color) = (1,1,1,1)  
    _MainTex ("Base (RGB) Alpha (A)", 2D) = "white"
 }

 Category 
 {
    Lighting Off
    ZWrite Off
    ZTest Always
    //ZWrite On  // uncomment if you have problems like the sprite disappear in some rotations.
    Cull Off
    Blend SrcAlpha OneMinusSrcAlpha
    AlphaTest Greater 0.1  // uncomment if you have problems like the sprites or 3d text have white quads instead of alpha pixels.
    Tags { "Queue"="Transparent" "IgnoreProjector"="True" "RenderType"="Transparent" }

    SubShader 
    {
      Pass
      {
         SetTexture [_MainTex]
         {
            ConstantColor [_Color]
            Combine Texture * constant
         }
      }
    }
 }
}