using UnityEngine;
using UnityEditor;
using System.Collections.Generic;

[CustomEditor(typeof(DecalType))]
public class DecalTypeEditor : Editor
{
    /// Draw cube
    [DrawGizmo(GizmoType.Pickable | GizmoType.Selected | GizmoType.NotSelected)]
    public static void DrawDecalToolGizmo(DecalType _decalType, GizmoType gizmoType)
    {

        if ((gizmoType & GizmoType.Selected) != 0)
        {
            Gizmos.matrix = _decalType.transform.localToWorldMatrix;
            Gizmos.color = new Color(1, 1, 1, 0.4F);
            Gizmos.DrawWireCube(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
            // Arrow
            Gizmos.matrix = Matrix4x4.identity;
            Gizmos.DrawLine(_decalType.transform.position - _decalType.transform.forward * _decalType.transform.localScale.z / 2
            - _decalType.transform.right * _decalType.transform.localScale.x / 2
            - _decalType.transform.up * _decalType.transform.localScale.y / 2, _decalType.transform.position + _decalType.transform.forward * _decalType.transform.localScale.z / 2);
            Gizmos.DrawLine(_decalType.transform.position - _decalType.transform.forward * _decalType.transform.localScale.z / 2
            + _decalType.transform.right * _decalType.transform.localScale.x / 2
            + _decalType.transform.up * _decalType.transform.localScale.y / 2, _decalType.transform.position + _decalType.transform.forward * _decalType.transform.localScale.z / 2);
            Gizmos.DrawLine(_decalType.transform.position - _decalType.transform.forward * _decalType.transform.localScale.z / 2
            + _decalType.transform.right * _decalType.transform.localScale.x / 2
            - _decalType.transform.up * _decalType.transform.localScale.y / 2, _decalType.transform.position + _decalType.transform.forward * _decalType.transform.localScale.z / 2);
            Gizmos.DrawLine(_decalType.transform.position - _decalType.transform.forward * _decalType.transform.localScale.z / 2
            - _decalType.transform.right * _decalType.transform.localScale.x / 2
            + _decalType.transform.up * _decalType.transform.localScale.y / 2, _decalType.transform.position + _decalType.transform.forward * _decalType.transform.localScale.z / 2);
        }
        else
        {
            Gizmos.DrawIcon(_decalType.transform.position, "DecalIcon");
        }
    }

    private static bool _dWasPressed;
    private static bool _cWasPressed;
    private static bool _sWasPressed;
    private static GameObject _objectForCombining;
    private static UnityEngine.Object[] _selectedObjects;

    private DecalType _decalType;
    private SerializedObject _serializeddecalType;
    private List<Mesh> _newMeshes = new List<Mesh>();
    private PreviousDecalState _previousState = new PreviousDecalState();
    private bool _drag = false;

    [System.Reflection.ObfuscationAttribute]
    public override void OnInspectorGUI()
    {
        _serializeddecalType.Update();

        //Protect user input////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        if (_decalType.transform.localScale.x < 0)
        {
            _decalType.transform.localScale = new Vector3(0.01F, _decalType.transform.localScale.y, _decalType.transform.localScale.z);
        }
        if (_decalType.transform.localScale.y < 0)
        {
            _decalType.transform.localScale = new Vector3(_decalType.transform.localScale.x, 0.01F, _decalType.transform.localScale.z);
        }
        if (_decalType.transform.localScale.z < 0)
        {
            _decalType.transform.localScale = new Vector3(_decalType.transform.localScale.x, _decalType.transform.localScale.y, 0.01F);
        }
        _decalType.i_normalThreshold = Mathf.Clamp(_decalType.i_normalThreshold, 0, 180);
        if (_decalType.i_bitOffset < 0)
            _decalType.i_bitOffset = 0;
        if (_decalType.i_atlasTilingU < 1)
            _decalType.i_atlasTilingU = 1;
        if (_decalType.i_atlasTilingV < 1)
            _decalType.i_atlasTilingV = 1;
        if (_decalType.i_combineEvery < 1)
            _decalType.i_combineEvery = 1;
        if (_decalType.i_destroyGenerationDelay < 2)
            _decalType.i_destroyGenerationDelay = 2;
        if (_decalType.i_fadingTime < 0)
            _decalType.i_fadingTime = 0;
        if (_decalType.i_maxSkinnedDecals < 1)
            _decalType.i_maxSkinnedDecals = 1;
        if (_decalType.i_expeditorLifeTime < 0)
            _decalType.i_expeditorLifeTime = 0;
        if (_decalType.i_mapSize < 1)
            _decalType.i_mapSize = 1;
        if (_decalType.i_mapSize > 2048)
            _decalType.i_mapSize = 2048;
        _decalType.i_minLevel = Mathf.Clamp01(_decalType.i_minLevel);
        _decalType.i_speedIncrease = Mathf.Clamp(_decalType.i_speedIncrease, 0, 100);
        _decalType.i_speedDecrease = Mathf.Clamp(_decalType.i_speedDecrease, 0, 100);
        _decalType.i_sourceBumpContrib = Mathf.Clamp01(_decalType.i_sourceBumpContrib);
        _decalType.i_growFramesCount = Mathf.Clamp(_decalType.i_growFramesCount, 0, 1000);
        _decalType.i_growSpeed = Mathf.Clamp(_decalType.i_growSpeed, 0, 100);
        _decalType.i_lifeTime = Mathf.Clamp(_decalType.i_lifeTime, 0, 100000);
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Top tex
        GUILayout.BeginVertical();
        GUILayout.BeginHorizontal();
        GUILayout.Space(10);
        GUIStyle box = new GUIStyle(GUI.skin.box);
        GUIStyle backGround = new GUIStyle(EditorStyles.popup);
        box.alignment = TextAnchor.MiddleCenter;
        backGround.font = box.font;
        backGround.margin.bottom = 10;
        backGround.margin.top = 10;
        backGround.margin.left = 0;
        backGround.margin.right = 10;

        if (_decalType.i_material)
        {
            if (_decalType.i_material.mainTexture)
            {
                GUILayout.Box(_decalType.i_material.mainTexture, box, GUILayout.Width(115), GUILayout.Height(115));//old
                Rect r = GUILayoutUtility.GetLastRect();
                GUI.DrawTexture(r, _decalType.i_material.mainTexture, ScaleMode.StretchToFill, false);
            }
            else
            {
                GUILayout.Box("Main Decal Texture", box, GUILayout.Width(115), GUILayout.Height(115));
            }

            if (_decalType.i_material.HasProperty("_BumpMap"))
            {
                if (_decalType.i_material.GetTexture("_BumpMap"))
                {
                    GUILayout.Box(_decalType.i_material.GetTexture("_BumpMap"), box, GUILayout.Width(115), GUILayout.Height(115));//old
                    Rect r = GUILayoutUtility.GetLastRect();
                    GUI.DrawTexture(r, _decalType.i_material.GetTexture("_BumpMap"), ScaleMode.StretchToFill, false);
                }
                else
                {
                    GUILayout.Box("Bumpmap Decal Texture", box, GUILayout.Width(115), GUILayout.Height(115));
                }
            }
        }
        else
        {
            GUILayout.Box("Decal Material Not Assigned", backGround, GUILayout.ExpandWidth(true));
        }
        GUILayout.EndHorizontal();

        GUILayout.Space(15);

        // properties
        GUIStyle foldout = new GUIStyle(EditorStyles.foldout);
        //Материал
        _decalType._materialFoldout = EditorGUILayout.Foldout(_decalType._materialFoldout, "Material", foldout);
        _serializeddecalType.FindProperty("_materialFoldout").boolValue = _decalType._materialFoldout;
        if (_decalType._materialFoldout)
        {
            GUILayout.Space(5);
            _decalType.i_material = EditorGUILayout.ObjectField(new GUIContent("   Decal Material", "Base decal material"), _decalType.i_material, typeof(Material)) as Material;
            _serializeddecalType.FindProperty("i_material").objectReferenceValue = _decalType.i_material;
            GUILayout.Space(5);
        }
        // components
        _decalType._meshComponentsFoldout = EditorGUILayout.Foldout(_decalType._meshComponentsFoldout, "Mesh Components Generation", foldout);
        _serializeddecalType.FindProperty("_meshComponentsFoldout").boolValue = _decalType._meshComponentsFoldout;
        if (_decalType._meshComponentsFoldout)
        {
            GUILayout.Space(5);
            GUILayout.BeginHorizontal();
            GUILayout.Space(8);
            _decalType.i_uv2 = GUILayout.Toggle(_decalType.i_uv2, new GUIContent("UV2", "To be generated UV2"));
            _serializeddecalType.FindProperty("i_uv2").boolValue = _decalType.i_uv2;
            _decalType.i_colors = GUILayout.Toggle(_decalType.i_colors, new GUIContent("Tangents2Colors", "Tangents from source mesh will be stored (pack to color) in colors array of decal mesh."));
            _serializeddecalType.FindProperty("i_colors").boolValue = _decalType.i_colors;
            _decalType.i_boneWeights = GUILayout.Toggle(_decalType.i_boneWeights, new GUIContent("BoneWeights", "To be generated boneweights, use it for skinned decals"));
            _serializeddecalType.FindProperty("i_boneWeights").boolValue = _decalType.i_boneWeights;
            GUILayout.EndHorizontal();

            GUILayout.Space(8);
            _decalType.i_uvGenerationMode = (UVGenerationMode)EditorGUILayout.EnumPopup(new GUIContent("   UV Generation", "UV generation method"), _decalType.i_uvGenerationMode);
            _serializeddecalType.FindProperty("i_uvGenerationMode").intValue = (int)_decalType.i_uvGenerationMode;
            EditorGUIUtility.LookLikeControls();
            _decalType.i_uvOffset = EditorGUILayout.Vector2Field("  UV Offset", _decalType.i_uvOffset);
            _serializeddecalType.FindProperty("i_uvOffset").vector2Value = _decalType.i_uvOffset;
            _decalType.i_uvScale = EditorGUILayout.Vector2Field("  UV Scale", _decalType.i_uvScale);
            _serializeddecalType.FindProperty("i_uvScale").vector2Value = _decalType.i_uvScale;
            GUILayout.Space(8);
            if (!_decalType.i_uv2)
                GUI.enabled = false;
            _decalType.i_uv2GenerationMode = (UVGenerationMode)EditorGUILayout.EnumPopup(new GUIContent("   UV2 Generation", "UV2 generation method, use Preserve for additive bumpmap shaders"), _decalType.i_uv2GenerationMode);
            _serializeddecalType.FindProperty("i_uv2GenerationMode").intValue = (int)_decalType.i_uv2GenerationMode;
            _decalType.i_uv2Offset = EditorGUILayout.Vector2Field("  UV2 Offset", _decalType.i_uv2Offset);
            _serializeddecalType.FindProperty("i_uv2Offset").vector2Value = _decalType.i_uv2Offset;
            _decalType.i_uv2Scale = EditorGUILayout.Vector2Field("  UV2 Scale", _decalType.i_uv2Scale);
            _serializeddecalType.FindProperty("i_uv2Scale").vector2Value = _decalType.i_uv2Scale;
            GUI.enabled = true;
            EditorGUIUtility.LookLikeInspector();

            if (!_decalType.i_boneWeights)
            {
                GUI.enabled = false;
            }
            _decalType.i_decalBoneWeightQuality = (DecalBoneWeightQuality)EditorGUILayout.EnumPopup(new GUIContent("   Bone Weight Quality", "Number of bones affected with decal"), _decalType.i_decalBoneWeightQuality);
            _serializeddecalType.FindProperty("i_decalBoneWeightQuality").intValue = (int)_decalType.i_decalBoneWeightQuality;
            GUI.enabled = true;
            GUILayout.Space(5);
        }
        //Edit
        _decalType._meshEditingFoldout = EditorGUILayout.Foldout(_decalType._meshEditingFoldout, "Mesh Editing", foldout);
        _serializeddecalType.FindProperty("_meshEditingFoldout").boolValue = _decalType._meshEditingFoldout;
        if (_decalType._meshEditingFoldout)
        {
            GUILayout.Space(5);
            _decalType.i_bitOffset = EditorGUILayout.FloatField(new GUIContent("   Mesh Offset", "Offset decal vertex along mesh normal.You can use depthOffset in your decal shaders also"), _decalType.i_bitOffset);
            _serializeddecalType.FindProperty("i_bitOffset").floatValue = _decalType.i_bitOffset;
            _decalType.i_normalThreshold = EditorGUILayout.FloatField(new GUIContent("   Normal Test Threshold", "Vertexes with angles between normal and decal forward direction more than this will not take into account. Use very small angle for flat decals like bullet holes"), _decalType.i_normalThreshold);
            _serializeddecalType.FindProperty("i_normalThreshold").floatValue = _decalType.i_normalThreshold;
            GUILayout.Space(5);
        }
        //Randomize
        _decalType._randomFoldout = EditorGUILayout.Foldout(_decalType._randomFoldout, "Randomize", foldout);
        _serializeddecalType.FindProperty("_randomFoldout").boolValue = _decalType._randomFoldout;
        if (_decalType._randomFoldout)
        {
            GUILayout.Space(5);
            _decalType.i_atlasTilingU = EditorGUILayout.IntField(new GUIContent("   Tile U", "Size of texture atlas in U direction"), _decalType.i_atlasTilingU);
            _serializeddecalType.FindProperty("i_atlasTilingU").intValue = _decalType.i_atlasTilingU;
            _decalType.i_atlasTilingV = EditorGUILayout.IntField(new GUIContent("   Tile V", "Size of texture atlas in V direction"), _decalType.i_atlasTilingV);
            _serializeddecalType.FindProperty("i_atlasTilingV").intValue = _decalType.i_atlasTilingV;
            EditorGUIUtility.LookLikeInspector();
            _decalType.i_randomMode = (RandomMode)EditorGUILayout.EnumPopup(new GUIContent("   Random Mode", "Mode for randomize size of decal"), _decalType.i_randomMode);
            _serializeddecalType.FindProperty("i_randomMode").intValue = (int)_decalType.i_randomMode;
            if (_decalType.i_randomMode != RandomMode.Evenly)
            {
                GUI.enabled = false;
            }
            _decalType.i_randomSize = EditorGUILayout.FloatField("   Random Size", _decalType.i_randomSize);
            _serializeddecalType.FindProperty("i_randomSize").floatValue = _decalType.i_randomSize;
            GUI.enabled = true;
            if (_decalType.i_randomMode != RandomMode.PerComponent)
            {
                GUI.enabled = false;
            }
            EditorGUIUtility.LookLikeControls();
            _decalType.i_randomVector = EditorGUILayout.Vector3Field("  Random Vector", _decalType.i_randomVector);
            _serializeddecalType.FindProperty("i_randomVector").vector3Value = _decalType.i_randomVector;
            EditorGUIUtility.LookLikeInspector();
            GUI.enabled = true;
            GUILayout.Space(5);
        }
        //Combining
        _decalType._decalCombiningAndLifeManagementFoldout = EditorGUILayout.Foldout(_decalType._decalCombiningAndLifeManagementFoldout, "Combining & Destruction", foldout);
        _serializeddecalType.FindProperty("_decalCombiningAndLifeManagementFoldout").boolValue = _decalType._decalCombiningAndLifeManagementFoldout;
        if (_decalType._decalCombiningAndLifeManagementFoldout)
        {
            GUILayout.Space(5);
            if (_decalType.i_flow)
                GUI.enabled = false;
            _decalType.i_combineEvery = EditorGUILayout.IntField(new GUIContent("   Combine Every", "After every 'N' decals ,all decals of this type will be combined in one mesh"), _decalType.i_combineEvery);
            _serializeddecalType.FindProperty("i_combineEvery").intValue = _decalType.i_combineEvery;
            _decalType.i_destroyGenerationDelay = EditorGUILayout.IntField(new GUIContent("   Destroy Generation Delay", "Decals combined in generation more than this will be destroyed"), _decalType.i_destroyGenerationDelay);
            _serializeddecalType.FindProperty("i_destroyGenerationDelay").intValue = _decalType.i_destroyGenerationDelay;
            if (!_decalType.i_boneWeights)
                GUI.enabled = false;
            _decalType.i_maxSkinnedDecals = EditorGUILayout.IntField(new GUIContent("   Max Skinned Decals", "Skinned decal older than this will be destroyed, Select BoneWeight = true for enabled"), _decalType.i_maxSkinnedDecals);
            _serializeddecalType.FindProperty("i_maxSkinnedDecals").intValue = _decalType.i_maxSkinnedDecals;
            GUI.enabled = true;
            _decalType.i_fade = EditorGUILayout.Toggle(new GUIContent("   Fade Decal", "Smooth hide decal before destroy"), _decalType.i_fade);
            _serializeddecalType.FindProperty("i_fade").boolValue = _decalType.i_fade;
            if (!_decalType.i_fade)
            {
                GUI.enabled = false;
            }
            _decalType.i_fadingTime = EditorGUILayout.FloatField(new GUIContent("   Fading Time", "Fading time before destroy"), _decalType.i_fadingTime);
            _serializeddecalType.FindProperty("i_fadingTime").floatValue = _decalType.i_fadingTime;
            GUI.enabled = true;
            if (_decalType.i_flow)
                GUI.enabled = false;
            _decalType.i_expeditorLifeTime =
                EditorGUILayout.FloatField(
                    new GUIContent("   Expeditor LifeTime",
                                   "How long time decal expeditor will be alive after last decal added"),
                    _decalType.i_expeditorLifeTime);
            _serializeddecalType.FindProperty("i_expeditorLifeTime").floatValue = _decalType.i_expeditorLifeTime;
            GUI.enabled = true;
            _decalType.i_layer = EditorGUILayout.LayerField(new GUIContent("   Dinamic Decal Layer", "All dynamic decals and all expeditors will be throw in this layer"), _decalType.i_layer);
            _serializeddecalType.FindProperty("i_layer").intValue = _decalType.i_layer;
            GUILayout.Space(5);
        }
        /*
        // Flow decals currently not working in Unity 3
        _decalType._flowFoldout = EditorGUILayout.Foldout(_decalType._flowFoldout, "Flow Settnigs", foldout);
        _serializeddecalType.FindProperty("_flowFoldout").boolValue = _decalType._flowFoldout;
        if (_decalType._flowFoldout)
        {
            GUILayout.Space(3);
            GUILayout.BeginHorizontal();
            GUILayout.Space(15);
            _decalType.i_flow = GUILayout.Toggle(_decalType.i_flow, new GUIContent("    Flow", "Activate flow effect"));
            _serializeddecalType.FindProperty("i_flow").boolValue = _decalType.i_flow;
            GUILayout.EndHorizontal();
            GUILayout.Space(3);
            if(_decalType.i_flow)
            {
                GUI.enabled = true;
            }
            else
            {
                GUI.enabled = false;
            }
            EditorGUIUtility.LookLikeControls();
            _decalType.i_gravity = EditorGUILayout.Vector3Field("  Gravity Vector", _decalType.i_gravity);
            _serializeddecalType.FindProperty("i_gravity").vector3Value = _decalType.i_gravity;
            EditorGUIUtility.LookLikeInspector();
            _decalType.i_mapSize = EditorGUILayout.IntField(new GUIContent("   Render Target Size", "Height of render target wich used for flow effect"), _decalType.i_mapSize);
            _serializeddecalType.FindProperty("i_mapSize").intValue = _decalType.i_mapSize;
            _decalType.i_minLevel = EditorGUILayout.FloatField(new GUIContent("   Min Level", "Minimum level of blood"),_decalType.i_minLevel);
            _serializeddecalType.FindProperty("i_minLevel").floatValue = _decalType.i_minLevel;
            _decalType.i_speedIncrease = EditorGUILayout.FloatField(new GUIContent("   Increase Speed", "How fast blood level increases"), _decalType.i_speedIncrease);
            _serializeddecalType.FindProperty("i_speedIncrease").floatValue = _decalType.i_speedIncrease;
            _decalType.i_speedDecrease = EditorGUILayout.FloatField(new GUIContent("   Decrease Speed", "How fast blood level decreases"), _decalType.i_speedDecrease);
            _serializeddecalType.FindProperty("i_speedDecrease").floatValue = _decalType.i_speedDecrease;
            _decalType.i_glue = EditorGUILayout.FloatField(new GUIContent("   Glue", "Fluid Viscosity"), _decalType.i_glue);
            _serializeddecalType.FindProperty("i_glue").floatValue = _decalType.i_glue;
            _decalType.i_sourceBumpContrib = EditorGUILayout.FloatField(new GUIContent("   Bump Contribution", "How much normal map of source surfase will be affect with flow"), _decalType.i_sourceBumpContrib);
            _serializeddecalType.FindProperty("i_sourceBumpContrib").floatValue = _decalType.i_sourceBumpContrib;
            _decalType.i_growFramesCount = EditorGUILayout.IntField(new GUIContent("   Level Grow Frames Count", "How long(in frames) level will be grow when decal created"), _decalType.i_growFramesCount);
            _serializeddecalType.FindProperty("i_growFramesCount").intValue = _decalType.i_growFramesCount;
            _decalType.i_growSpeed = EditorGUILayout.FloatField(new GUIContent("   Grow Speed", "Speed of grow / per frame"), _decalType.i_growSpeed);
            _serializeddecalType.FindProperty("i_growSpeed").floatValue = _decalType.i_growSpeed;
            _decalType.i_lifeTime = EditorGUILayout.FloatField(new GUIContent("   Life Time", "How long decal will be alive"), _decalType.i_lifeTime);
            _serializeddecalType.FindProperty("i_lifeTime").floatValue = _decalType.i_lifeTime;
            _decalType.i_flowType = (FlowType)EditorGUILayout.EnumPopup(new GUIContent("   Flow Type", "How fluid will be flow"), _decalType.i_flowType);
            _serializeddecalType.FindProperty("i_flowType").intValue = (int)_decalType.i_flowType;
            _decalType.i_gravityShader = EditorGUILayout.ObjectField(new GUIContent("   Gravity Shader", "Shader for gravity map, if null then will be Frameshift/Decal/Gravity"), _decalType.i_gravityShader, typeof(Shader)) as Shader;
            _serializeddecalType.FindProperty("i_gravityShader").objectReferenceValue =(Shader) _decalType.i_gravityShader;
            GUI.enabled = true;
        }
         * */
        GUILayout.Space(15);
        GUILayout.EndVertical();

        //DrawDefaultInspector();

        // if in Editor
        if (!Application.isPlaying && WasChanged())
        {
            BurnDecal();
        }

        // Save state
        _previousState.pos = _decalType.transform.position;
        _previousState.rot = _decalType.transform.rotation;
        _previousState.scale = _decalType.transform.localScale;
        _previousState.uv2 = _decalType.i_uv2;
        _previousState.colors = _decalType.i_colors;
        _previousState.boneWeight = _decalType.i_boneWeights;
        _previousState.uvGen = _decalType.i_uvGenerationMode;
        _previousState.uv2Gen = _decalType.i_uv2GenerationMode;
        _previousState.uvOf = _decalType.i_uvOffset;
        _previousState.uvScale = _decalType.i_uvScale;
        _previousState.uv2Of = _decalType.i_uv2Offset;
        _previousState.uv2Scale = _decalType.i_uv2Scale;
        _previousState.boneQual = _decalType.i_decalBoneWeightQuality;
        _previousState.meshOfset = _decalType.i_bitOffset;
        _previousState.normalThresh = _decalType.i_normalThreshold;
        _previousState.project = _decalType.i_projectionMask;
        _previousState.listCount = _decalType.i_ignoreList.Count;
        _previousState.mat = _decalType.i_material;

        _decalType.i_objectsUnderProjection.Clear();

        _serializeddecalType.ApplyModifiedProperties();
    }

    [System.Reflection.ObfuscationAttribute]
    private void OnEnable()
    {
        _decalType = target as DecalType;
        _serializeddecalType = new SerializedObject(target);
        _dWasPressed = false;
        _cWasPressed = false;
        _sWasPressed = false;
    }
    [System.Reflection.ObfuscationAttribute]
    private void OnDisable()
    {
        _dWasPressed = false;
        _cWasPressed = false;
        _sWasPressed = false;
        _newMeshes.Clear();
    }
    [System.Reflection.ObfuscationAttribute]
    protected void OnSceneGUI()
    {

        // Not show if prefab
        PrefabType pfefabType = EditorUtility.GetPrefabType(_decalType.gameObject);
        if (pfefabType == PrefabType.Prefab || !_decalType.gameObject.active)
            return;

        if (Event.current.keyCode == KeyCode.Escape)
        {
            _dWasPressed = false;
            _sWasPressed = false;
            _cWasPressed = false;
        }


        #region HANDLES
        // Ignor
        foreach (GameObject g in _decalType.i_ignoreList)
        {
            GUI.color = Color.red;
            Handles.Label(g.transform.position, "Ignore");
            GUI.color = Color.white;
        }
        // Combine
        if (_objectForCombining)
        {
            GUI.color = Color.blue;
            Handles.Label(_objectForCombining.transform.position, "Combine");
            GUI.color = Color.white;
        }

        #endregion

        #region ГУИ
        Handles.BeginGUI();

        float panelYPos = Screen.height - 55;

        //Panel
        GUI.Box(new Rect(-5, panelYPos, Screen.width + 10, 20), "", EditorStyles.toolbar);

        GUI.Label(new Rect(Screen.width / 2 + 150, Screen.height - 75, 300, 20), " Use MMB to pick objects or set decal position");

        // Proj type
        _decalType._decalDragProjectionType = (DecalDragProjectionType)GUI.Toolbar(new Rect(0, Screen.height - 55, 165, 20), (int)_decalType._decalDragProjectionType, new GUIContent[2] { new GUIContent("Along Camera", "Project decal onto mesh using camera direction"), new GUIContent("Along Normal", "Project decal onto mesh using mesh normal") }, EditorStyles.toolbarButton);

        //Pick
        if (!_dWasPressed && !_sWasPressed && !_cWasPressed)
        {
            if (GUI.Button(new Rect(Screen.width / 2 - 149, Screen.height - 80, 100, 20), "Pick Ignore"))
                _cWasPressed = true;
            if (GUI.Button(new Rect(Screen.width / 2 - 50, Screen.height - 80, 100, 20), "Pick Combine"))
                _sWasPressed = true;
            if (GUI.Button(new Rect(Screen.width / 2 + 49, Screen.height - 80, 100, 20), "Set Position"))
                _dWasPressed = true;
        }

        if (_dWasPressed || _sWasPressed || _cWasPressed)
        {
            HandleUtility.Repaint();
            if (GUI.Button(new Rect(Screen.width / 2 - 90, Screen.height - 80, 95, 20), "Cancel"))
                _sWasPressed = _cWasPressed = _dWasPressed = false;
        }


        //Clear ignor
        if (GUI.Button(new Rect(165, panelYPos, 75, 20), new GUIContent("Clear Ignore", "Clears ignorlist for this decal"), EditorStyles.toolbarButton))
            _decalType.i_ignoreList.Clear();

        // Combine
        if (GUI.Button(new Rect(615, panelYPos, 55, 20), new GUIContent("Combine", "Combine selected decals in one mesh. Hold down D+S buttons and select parent object"), EditorStyles.toolbarButton))
        {
            Undo.RegisterSceneUndo("Combine Static Decals");

            List<DecalType> decalTypes = new List<DecalType>();
            foreach (Transform t in Selection.transforms)
            {
                if (t.GetComponent("DecalType") as DecalType)
                {
                    decalTypes.Add(t.GetComponent("DecalType") as DecalType);
                }
            }

            if (EditorUtility.DisplayDialog("Combining", "Destroy Decal Objects", "Yes", "No"))
            {
                Selection.activeGameObject = DecalCreator.CreateCombinedStaticDecalInEditor(decalTypes, _objectForCombining, true);
            }
            else
            {
                Selection.activeGameObject = DecalCreator.CreateCombinedStaticDecalInEditor(decalTypes, _objectForCombining, false);
            }
        }
        GUI.contentColor = Color.black;
        GUI.Label(new Rect(360, panelYPos, 150, 20), new GUIContent("Combine Object", "Parent object for combining, if NULL decals will be combine in world space"));
        GUI.contentColor = Color.white;
        _objectForCombining = EditorGUI.ObjectField(new Rect(455, panelYPos, 150, 18), _objectForCombining, typeof(GameObject)) as GameObject;
        if (Event.current.type == EventType.MouseUp && new Rect(500, panelYPos, 150, 20).Contains(Event.current.mousePosition))
        {
            Selection.objects = _selectedObjects;
        }
        if (Event.current.type == EventType.DragExited)
        {
            Selection.objects = _selectedObjects;
            _objectForCombining = DragAndDrop.objectReferences[0] as GameObject;
        }

        // Skin Combine
        if (GUI.Button(new Rect(670, panelYPos, 105, 20), new GUIContent("Combine With Skin", "Combine selected decals with skinned mesh"), EditorStyles.toolbarButton))
        {
            Undo.RegisterSceneUndo("Combine decal with skin");
            if (_objectForCombining)
            {
                if (_objectForCombining.GetComponent<SkinnedMeshRenderer>())
                {
                    // All decals from select
                    List<DecalType> decalTypes = new List<DecalType>();
                    foreach (Transform t in Selection.transforms)
                    {
                        if (t.GetComponent("DecalType") as DecalType)
                        {
                            decalTypes.Add(t.GetComponent("DecalType") as DecalType);
                        }
                    }

                    if (EditorUtility.DisplayDialog("Combining", "Destroy Decal Objects", "Yes", "No"))
                    {
                        DecalCreator.CreateCombinedSkinDecalInEditor(decalTypes, _objectForCombining, true);
                    }
                    else
                    {
                        DecalCreator.CreateCombinedSkinDecalInEditor(decalTypes, _objectForCombining, false);
                    }
                }
                else
                {
                    throw new MissingComponentException("Combinning object have no SkinnedMeshRenderer component");
                }
            }
            else
            {
                throw new MissingReferenceException("Combinning object have NULL reference");
            }

        }


        // Mask
        GUIStyle meshButton = new GUIStyle(EditorStyles.toolbarButton);
        if ((_decalType.i_projectionMask & MeshTypes.Mesh) != 0)
            meshButton.normal.background = EditorStyles.toolbarButton.onActive.background;
        else
            meshButton.normal.background = EditorStyles.toolbarButton.normal.background;

        GUIStyle skinedMeshButton = new GUIStyle(EditorStyles.toolbarButton);
        if ((_decalType.i_projectionMask & MeshTypes.SkinedMesh) != 0)
            skinedMeshButton.normal.background = EditorStyles.toolbarButton.onActive.background;
        else
            skinedMeshButton.normal.background = EditorStyles.toolbarButton.normal.background;

        if (GUI.Button(new Rect(255, panelYPos, 40, 20), new GUIContent("Mesh", "Project decal onto mesh"), meshButton))
        {
            if ((_decalType.i_projectionMask & MeshTypes.Mesh) != 0)
                _decalType.i_projectionMask ^= MeshTypes.Mesh;
            else
                _decalType.i_projectionMask |= MeshTypes.Mesh;
        }
        if (GUI.Button(new Rect(295, panelYPos, 40, 20), new GUIContent("Skin", "Project decal onto skin"), skinedMeshButton))
        {
            if ((_decalType.i_projectionMask & MeshTypes.SkinedMesh) != 0)
            {
                _decalType.i_projectionMask ^= MeshTypes.SkinedMesh;
            }
            else
            {
                _decalType.i_projectionMask |= MeshTypes.SkinedMesh;
                _decalType.i_boneWeights = true;
            }
        }

        Handles.EndGUI();
        #endregion

        // Key Buttons
        if (Event.current.keyCode == KeyCode.D && Event.current.type == EventType.KeyDown)
            _dWasPressed = true;
        if (Event.current.keyCode == KeyCode.D && Event.current.type == EventType.KeyUp)
            _dWasPressed = false;
        if (Event.current.keyCode == KeyCode.C && Event.current.type == EventType.KeyDown && _dWasPressed)
            _cWasPressed = true;
        if (Event.current.keyCode == KeyCode.C && Event.current.type == EventType.KeyUp)
            _cWasPressed = false;
        if (Event.current.keyCode == KeyCode.S && Event.current.type == EventType.KeyDown && _dWasPressed)
            _sWasPressed = true;
        if (Event.current.keyCode == KeyCode.S && Event.current.type == EventType.KeyUp)
            _sWasPressed = false;


        // Smart pos
        if (_cWasPressed)//C
        {
            Selection.objects = _selectedObjects;
            if (Event.current.type == EventType.MouseDown && Event.current.button == 2)
            {
                Event.current.Use();
                GameObject pickedObject = HandleUtility.PickGameObject(Event.current.mousePosition, false);

                if (pickedObject && pickedObject != _decalType.gameObject && !(pickedObject.GetComponent("DecalType") as DecalType))
                {
                    if (!_decalType.i_ignoreList.Contains(pickedObject))
                    {
                        _decalType.i_ignoreList.Add(pickedObject);
                    }
                    else
                    {
                        _decalType.i_ignoreList.Remove(pickedObject);
                    }
                }
            }
        }
        else if (_sWasPressed)//S
        {
            Selection.objects = _selectedObjects;
            if (Event.current.type == EventType.MouseDown && Event.current.button == 2)
            {
                Event.current.Use();
                GameObject pickedObject = HandleUtility.PickGameObject(Event.current.mousePosition, false);

                if (pickedObject && !(pickedObject.GetComponent("DecalType") as DecalType))
                {
                    if (pickedObject == _objectForCombining)
                        _objectForCombining = null;
                    else
                        _objectForCombining = pickedObject;
                }

            }
        }
        else//Only D
        {
            if (_dWasPressed && Event.current.type == EventType.MouseDown && Event.current.button == 2)
            {
                Selection.objects = _selectedObjects;
                _drag = true;
            }
            if (Event.current.type == EventType.MouseUp)
            {
                _drag = false;
            }

            if (_drag)
            {
                Event.current.Use();
                RaycastHit hit;
                Physics.Raycast(HandleUtility.GUIPointToWorldRay(Event.current.mousePosition), out hit);

                if (hit.collider)
                {
                    _decalType.transform.position = hit.point;
                    if (_decalType._decalDragProjectionType == DecalDragProjectionType.AlongSurfaceNormal)
                        _decalType.transform.rotation = Quaternion.LookRotation(-hit.normal, Vector3.up);
                    else
                        _decalType.transform.rotation = Quaternion.LookRotation(HandleUtility.GUIPointToWorldRay(Event.current.mousePosition).direction, Vector3.up);
                }
            }
        }

        //if (_dWasPressed)
        //{
        //    Event.current.Use();
        //    Selection.activeGameObject = _decalType.gameObject;

        //    RaycastHit hit;
        //    Physics.Raycast(HandleUtility.GUIPointToWorldRay(Event.current.mousePosition), out hit);

        //    if (hit.collider)
        //    {
        //        _decalType.transform.position = hit.point;
        //        if (_decalType._decalDragProjectionType == DecalDragProjectionType.AlongSurfaceNormal)
        //            _decalType.transform.rotation = Quaternion.LookRotation(-hit.normal, Vector3.up);
        //        else
        //            _decalType.transform.rotation = Quaternion.LookRotation(HandleUtility.GUIPointToWorldRay(Event.current.mousePosition).direction, Vector3.up);
        //    }
        //}

        // Save selection
        _selectedObjects = Selection.gameObjects as UnityEngine.Object[];

        Repaint();
    }
    private void BurnDecal()
    {
        // If decal in scene exit
        if (EditorUtility.GetPrefabType(_decalType.gameObject) != PrefabType.PrefabInstance && EditorUtility.GetPrefabType(_decalType.gameObject) != PrefabType.DisconnectedPrefabInstance)
            return;

        // Clear temp 
        DestroyImmediate(_decalType.StaticDecalMesh);
        _newMeshes.Clear();

        // Create meshes
        Plane[] planes = DecalCreator.CreatePlanes(_decalType);
        GameObject[] allGameObjects = GameObject.FindObjectsOfType(typeof(GameObject)) as GameObject[];
        foreach (GameObject g in allGameObjects)
        {
            // Mask
            if (_decalType.i_projectionMask == 0)
                continue;
            else if ((int)_decalType.i_projectionMask == 1)
            {
                if (g.GetComponent<SkinnedMeshRenderer>())
                    continue;
            }
            else if ((int)_decalType.i_projectionMask == 2)
            {
                if (g.GetComponent<MeshFilter>())
                    continue;
            }
            else
            {

            }

            if (!g.renderer || _decalType.i_ignoreList.Contains(g) || g.GetComponent("DecalType") as DecalType)
                continue;

            if (GeometryUtility.TestPlanesAABB(planes, g.renderer.bounds))
            {
                _decalType.i_objectsUnderProjection.Add(g);
                Mesh mesh = DecalCreator.CreateDecalMesh(_decalType, _decalType.transform.position, _decalType.transform.forward, g, Vector3.zero);
                if (mesh)
                {
                    mesh.name = "Temp decal";
                    if (mesh.vertices.Length > 0)
                        _newMeshes.Add(mesh);
                    else
                        DestroyImmediate(mesh);
                }
            }
        }

        if (_newMeshes.Count == 0)
            return;
        else
        {
            _decalType.StaticDecalMesh = DecalCreator.CreateCombinedMesh(_newMeshes);
        }

        DecalCreator.CreateStaticDecal(_decalType.StaticDecalMesh, null, _decalType);

        // Delete temp
        foreach (Mesh mesh in _newMeshes)
        {
            DestroyImmediate(mesh);
        }
    }
    private bool WasChanged()
    {
        if (_decalType.transform.position != _previousState.pos)
            return true;
        if (_decalType.transform.rotation != _previousState.rot)
            return true;
        if (_decalType.transform.localScale != _previousState.scale)
            return true;
        if (_previousState.uv2 != _decalType.i_uv2)
            return true;
        if (_previousState.colors != _decalType.i_colors)
            return true;
        if (_previousState.boneWeight != _decalType.i_boneWeights)
            return true;
        if (_previousState.uvGen != _decalType.i_uvGenerationMode)
            return true;
        if (_previousState.uv2Gen != _decalType.i_uv2GenerationMode)
            return true;
        if (_previousState.uvOf != _decalType.i_uvOffset)
            return true;
        if (_previousState.uvScale != _decalType.i_uvScale)
            return true;
        if (_previousState.uv2Of != _decalType.i_uv2Offset)
            return true;
        if (_previousState.uv2Scale != _decalType.i_uv2Scale)
            return true;
        if (_previousState.boneQual != _decalType.i_decalBoneWeightQuality)
            return true;
        if (_previousState.meshOfset != _decalType.i_bitOffset)
            return true;
        if (_previousState.normalThresh != _decalType.i_normalThreshold)
            return true;
        if (_previousState.project != _decalType.i_projectionMask)
            return true;
        if (_previousState.listCount != _decalType.i_ignoreList.Count)
            return true;
        if (_previousState.mat != _decalType.i_material)
            return true;

        return false;
    }

}
/// <summary>
/// State storing
/// </summary>
struct PreviousDecalState
{
    public Vector3 pos;
    public Quaternion rot;
    public Vector3 scale;
    public bool uv2;
    public bool colors;
    public bool boneWeight;
    public UVGenerationMode uvGen;
    public UVGenerationMode uv2Gen;
    public Vector2 uvOf;
    public Vector2 uvScale;
    public Vector2 uv2Of;
    public Vector2 uv2Scale;
    public DecalBoneWeightQuality boneQual;
    public float meshOfset;
    public float normalThresh;
    public MeshTypes project;
    public int listCount;
    public Material mat;
}
