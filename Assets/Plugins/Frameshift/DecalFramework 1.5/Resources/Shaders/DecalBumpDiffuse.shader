Shader "Frameshift/Decal/1.5/Bumped Diffuse" {
Properties {
	_Color ("Main Color", Color) = (1,1,1,1)
	_MainTex ("Base (RGB)", 2D) = "white" {}
	_BumpMap ("Normalmap", 2D) = "bump" {}
}

SubShader {
	Tags { "RenderType"="Opaque" "Queue" = "Overlay" "Fluid" = "Blood"}
	LOD 300
	//Offset  -1, -1
	AlphaTest Greater 0
	ZWrite On
	Blend SrcAlpha OneMinusSrcAlpha

CGPROGRAM
#pragma surface surf Lambert

sampler2D _MainTex;
sampler2D _BumpMap;
float4 _Color;


struct Input {
	float2 uv_MainTex;
	float2 uv_BumpMap;
};

float4 _SourceBumpMap_ST;

void surf (Input IN, inout SurfaceOutput o) {
	half4 c = tex2D(_MainTex, IN.uv_MainTex) * _Color;
	o.Albedo = c.rgb;
	o.Alpha = c.a;

	o.Normal = UnpackNormal(tex2D(_BumpMap, IN.uv_BumpMap));
}
ENDCG  
}

FallBack "Diffuse"
}