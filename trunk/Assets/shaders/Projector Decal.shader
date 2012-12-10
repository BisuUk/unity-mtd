Shader "Custom/Projector Decal" { 

    Properties {
        _ShadowTex ("Cookie", 2D) = "gray" { TexGen ObjectLinear }
        _FalloffTex ("FallOff", 2D) = "white" { TexGen ObjectLinear }
        _TintColor ("TintColor", Color) = (0,0,0,0)

    }

     Subshader {
        Pass {
            ZWrite Off
            Offset -1, -1
            Fog { Color (1, 1, 1) }
            AlphaTest Greater 0
            ColorMask RGB
            //Blend DstColor Zero
            //Blend One One
            Blend SrcAlpha OneMinusSrcAlpha

            SetTexture [_ShadowTex] {
                combine texture, texture
                Matrix [_Projector]
            }

            SetTexture [_FalloffTex] {
                constantColor (1,1,1,0)
                combine previous lerp (texture) constant
                Matrix [_ProjectorClip]
            }

            SetTexture [_FalloffTex] { // add offset
                constantColor [_TintColor]
                combine previous + constant
            }
        }
    }
}