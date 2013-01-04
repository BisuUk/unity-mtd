using System.IO;
using UnityEngine;
using UnityEditor;

public class DecalMenu : EditorWindow
{
    public static string _error = "";

    protected static DecalMenu _menu;


    /// Creates the decal in asset.
    [MenuItem("Assets/Create/DecalType")]
    public static void CreateDecalAsset()
    {
        CreateDecalAssetBase();
    }
    /// Show About
    [MenuItem("Decal Framework/About")]
    public static void FrameshiftAbout()
    {
        Init();
    }
    /// Init Window
    private static void Init()
    {
        DecalMenu window = EditorWindow.GetWindow(typeof(DecalMenu)) as DecalMenu;
        window.Show();
    }
    /// Create decal prefab
    protected static void CreateDecalAssetBase()
    {
        string pathFolder = AssetDatabase.GetAssetPath(Selection.activeObject);

        if (string.IsNullOrEmpty(pathFolder))
        {
            pathFolder = "Assets/";
        }
        else
        {
            string extention = Path.GetExtension(pathFolder);

            if (string.IsNullOrEmpty(extention))
                pathFolder = pathFolder + "/";
            else
                pathFolder = Path.GetDirectoryName(pathFolder) + "/";
        }

        // Create decal
        string path = AssetDatabase.GenerateUniqueAssetPath(pathFolder + "New Decal Type" + ".prefab");
        UnityEngine.Object decalPrefabObject = EditorUtility.CreateEmptyPrefab(path);
        GameObject gObject = new GameObject();
        GameObject decal = EditorUtility.ReplacePrefab(gObject, decalPrefabObject);
        decal.AddComponent("DecalType");
        DestroyImmediate(gObject);
        AssetDatabase.Refresh();
        Selection.activeObject = decal;
    }

    [System.Reflection.ObfuscationAttribute]
    private void OnGUI()
    {
        GUIStyle label = new GUIStyle(EditorStyles.label);
        label.alignment = TextAnchor.UpperLeft;

        GUI.Label(new Rect(10, 10, 300, 80), "Frameshift Decal Framework v 1.5.\n\nConsider any suggestion for collaboration.\nAll proposals and suggestions please send by mail\nor Skype.", label);
        GUI.Label(new Rect(10, 85, 300, 20), "     http://unity3dstore.com", label);
        GUI.Label(new Rect(10, 100, 300, 20), "     support@unity3dstore.com", label);
        GUI.Label(new Rect(10, 115, 300, 20), "     Skype: mentalauto", label);
    }
}
