Shader "Custom/Parallax Specular Outline"
{
   Properties
   {
      _Color ("Main Color", Color) = (1,1,1,1)
      _OutlineColor ("Outline Color", Color) = (0,0,0,1)
      _Outline ("Outline width", Range (.002, 0.03)) = .005
      _SpecColor ("Specular Color", Color) = (0.5, 0.5, 0.5, 1)
      _Shininess ("Shininess", Range (0.01, 1)) = 0.078125
      _Parallax ("Height", Range (0.005, 0.08)) = 0.02
      _MainTex ("Base (RGB) Gloss (A)", 2D) = "white" {}
      _BumpMap ("Normalmap", 2D) = "bump" {}
      _ParallaxMap ("Heightmap (A)", 2D) = "black" {}
   }

   SubShader
   {
      Tags { "RenderType"="Opaque" }

      Pass
      {
         Cull Front
         ZWrite On
         ColorMask RGB
         Blend SrcAlpha OneMinusSrcAlpha

CGPROGRAM
         // Upgrade NOTE: excluded shader from OpenGL ES 2.0 because it does not contain a surface program or both vertex and fragment programs.
         #include "UnityCG.cginc"
         #pragma vertex vert
         #pragma fragment frag

         struct appdata {
            float4 vertex : POSITION;
            float3 normal : NORMAL;
         };
         
         struct v2f {
            float4 pos : POSITION;
            float4 color : COLOR;
         };
         
         uniform float _Outline;
         uniform float4 _OutlineColor;
         
         v2f vert(appdata v)
         {
            v2f o;
            o.pos = mul(UNITY_MATRIX_MVP, v.vertex);
   
            float3 norm   = mul ((float3x3)UNITY_MATRIX_IT_MV, v.normal);
            float2 offset = TransformViewToProjection(norm.xy);
   
            o.pos.xy += offset * o.pos.z * _Outline;
            o.color = _OutlineColor;
            return o;
         }

         half4 frag(v2f i) :COLOR { return i.color; }

ENDCG
      }
      
CGPROGRAM
      // Upgrade NOTE: excluded shader from OpenGL ES 2.0 because it does not contain a surface program or both vertex and fragment programs.
      #pragma exclude_renderers gles
      #pragma surface surf BlinnPhong
      #pragma target 3.0

      sampler2D _MainTex;
      sampler2D _BumpMap;
      sampler2D _ParallaxMap;
      fixed4 _Color;
      half _Shininess;
      float _Parallax;
      
      struct Input
      {
         float2 uv_MainTex;
         float2 uv_BumpMap;
         float3 viewDir;
      };
      
      void surf (Input IN, inout SurfaceOutput o)
      {
         half h = tex2D (_ParallaxMap, IN.uv_BumpMap).w;
         float2 offset = ParallaxOffset (h, _Parallax, IN.viewDir);
         IN.uv_MainTex += offset;
         IN.uv_BumpMap += offset;
   
         fixed4 tex = tex2D(_MainTex, IN.uv_MainTex);
         o.Albedo = tex.rgb * _Color.rgb;
         o.Gloss = tex.a;
         o.Alpha = tex.a * _Color.a;
         o.Specular = _Shininess;
         o.Normal = UnpackNormal(tex2D(_BumpMap, IN.uv_BumpMap));
      }
      ENDCG
   }

FallBack "Bumped Specular"
}
