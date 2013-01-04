using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// $b$Holder (parent) for all DecalExpeditors on certain GameObject$bb$
/// </summary>
public class DecalHolder : MonoBehaviour
{
    private Dictionary<DecalType, GameObject> _decalType2DecalObject = new Dictionary<DecalType, GameObject>();
    public Dictionary<DecalType, GameObject> DecalType2DecalObject
    {
        get { return _decalType2DecalObject; }
    }

    /// <summary>
    /// $b$Get certain DecalExpeditor on this DecalHolder (parented to this GameObject)$bb$
    /// </summary>
    /// <param name="decalType">DecalType for search DecalExpeditor</param>
    /// <returns>$b$DecalExpeditor (parent) for all Decals of type decalType on this GameObject (Holder).$bb$</returns>
    public GameObject GetExpeditor(DecalType decalType)
    {
        GameObject result;
        _decalType2DecalObject.TryGetValue(decalType,out result);
        return result;
    }
    /// <summary>
    /// $b$Get all DecalExpeditors on this DecalHolder (parented to this GameObject)$bb$
    /// </summary>
    /// <returns>$b$All DecalExpeditors (parents) for all DecalTypes on this GameObject (Holder).$bb$</returns>
    public GameObject[] GetAllExpeditors()
    {
        List<GameObject> result=new List<GameObject>();
        foreach (GameObject obj in _decalType2DecalObject.Values)
        {
            result.Add(obj);
        }
        return result.ToArray();
    }
}
