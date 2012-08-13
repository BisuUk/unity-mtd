   Shader "Custom/Wavy Vertex"
   {
   
   Properties
   {
      _Color ("Main Color", Color) = (0.5,0.5,0.5,1)
      //_OutlineColor ("Outline Color", Color) = (0,0,0,1)
      //_Outline ("Outline width", Range (.002, 0.03)) = .005
      _MainTex ("Base (RGB)", 2D) = "white" {}
      //_Ramp ("Toon Ramp (RGB)", 2D) = "gray" {}
      _WaveSpeed ("Wave Speed", float) = 50.0
   }
   
   SubShader
   {
      Tags { "Queue"="Transparent" "IgnoreProjector"="True" "RenderType"="Transparent" }

      Pass
      {
         Cull Off
         Lighting On
         Blend SrcAlpha OneMinusSrcAlpha
         ZWrite Off

         CGPROGRAM
         #pragma vertex vert
         #pragma fragment frag
         #include "UnityCG.cginc"
         #include "AutoLight.cginc"
   
         float4 _Color;
         sampler2D _MainTex;
         float _WaveSpeed;
         uniform float _Outline;
         uniform float4 _OutlineColor;

         // vertex input: position, normal
         struct appdata {
            float4 vertex : POSITION;
            float4 texcoord : TEXCOORD0;
            float3 normal : NORMAL;
         };
   
         struct v2f {
            float4 pos : POSITION;
            float2 uv: TEXCOORD0;
            float4 color : COLOR;
         };

         v2f vert (appdata v) {
            v2f o;
            
            float sinOff=v.vertex.x+v.vertex.y+v.vertex.z;
            float t=_Time*_WaveSpeed;
            if(t < 0.0) t *= -1.0;
            float fx=v.texcoord.x;
            float fy=v.texcoord.x*v.texcoord.y;

            v.vertex.x+=sin(t*1.45+sinOff)*fx*0.5;
            v.vertex.y+=sin(t*3.12+sinOff)*fx*0.5-fy*0.9;
            v.vertex.z-=sin(t*2.2+sinOff)*fx*0.2;

            o.pos = mul( UNITY_MATRIX_MVP, v.vertex );
            o.uv = v.texcoord;

            //float3 norm   = mul ((float3x3)UNITY_MATRIX_IT_MV, v.normal);
            //float2 offset = TransformViewToProjection(norm.xy);

            //o.pos.xy += offset * o.pos.z * _Outline;
            //o.color = _OutlineColor;

            return o;
         }
   
         float4 frag (v2f i) : COLOR
         {
            half4 color = tex2D(_MainTex, i.uv) * _Color;
            return color;
         }

         ENDCG
       }

      //UsePass "Toon/Lighted/FORWARD"
      //UsePass "Toon/Basic Outline/OUTLINE"

   }
      Fallback "VertexLit"
   }