import csv
import matplotlib.pyplot as plt
import numpy as np
###import tensorflow as tf
import sklearn
from sklearn import svm
from datetime import datetime


path="../drunkare-node/data.csv"
file=open(path, newline='')
reader=csv.reader(file)

header=next(reader)
#separate data, label for training and test 
training_set=[]
test_set=[]
training_label=[]
test_label=[]
label_count=np.zeros(17)

for row in reader:
    msec= []
    
    #for acc
    X_acc=[]
    Y_acc=[]
    Z_acc=[]
    #for gyro
    X_gyro=[]
    Y_gyro=[]
    Z_gyro=[]
    
    #row = [Date, msec,label,X_acc,Y_acc,Z_acc,X_gyro,Y_gyro,Z_gyro]
    date=datetime.strptime(row[0],'%Y/%m/%d')
    msec=row[1:3]
    labl=int(row[3]) #label
    label_count[labl]+=1
    row[4:]=[float(i) for i in row[4:]]
        
    X_acc=(row[4:604])
    Y_acc=(row[604:1204])
    Z_acc=(row[1204:1804])
    X_gyro=(row[1804:2404])
    Y_gyro=(row[2404:3004])
    Z_gyro=(row[3004:3604])

    #6*6*100 float array : will be feature-extracted
    window=np.array([[X_acc[0:100],X_acc[100:200],X_acc[200:300],X_acc[300:400],X_acc[400:500],X_acc[500:600]],
                [Y_acc[0:100],Y_acc[100:200],Y_acc[200:300],Y_acc[300:400],Y_acc[400:500],Y_acc[500:600]],
                [Z_acc[0:100],Z_acc[100:200],Z_acc[200:300],Z_acc[300:400],Z_acc[400:500],Z_acc[500:600]],
                [X_gyro[0:100],X_gyro[100:200],X_gyro[200:300],X_gyro[300:400],X_gyro[400:500],X_gyro[500:600]],
                [Y_gyro[0:100],Y_gyro[100:200],Y_gyro[200:300],Y_gyro[300:400],Y_gyro[400:500],Y_gyro[500:600]],
                [Z_gyro[0:100],Z_gyro[100:200],Z_gyro[200:300],Z_gyro[300:400],Z_gyro[400:500],Z_gyro[500:600]]])
    
    #5 features  what else?
    window_mean=window.mean(axis=-1)
    window_stddev=window.std(axis=-1)
    window_median=np.median(window,axis=-1)
    window_percent25=np.percentile(window,25,axis=-1)
    window_percent75=np.percentile(window,75,axis=-1)

    window_feature=np.array([[window_mean],[window_stddev],[window_median],[window_percent25],[window_percent75]])
    window_feature=window_feature.reshape(180)
    
    if (label_count[labl]%5!=1):
        training_set.append(window_feature)
        training_label.append(labl)
    else:
        test_set.append(window_feature)
        test_label.append(labl)

#label=int(row[3])
#print(window_feature.shape)
#parsing complete


#SVM
#prepare the data
X=training_set
y=training_label
#prepare the model
clf = sklearn.svm.SVC(gamma='scale',tol=0.1)

clf.fit(X,y)
from sklearn.metrics import confusion_matrix
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import OneHotEncoder
test_pred1=clf.predict(test_set)

ohc=OneHotEncoder(categories=[range(16)])
onehot_pred1=test_pred1.reshape(45,-1)
onehot_pred1=ohc.fit_transform(onehot_pred1).toarray()
print(test_pred1)
#print(onehot_pred1)

#print(accuracy_score(test_pred1,test_label))
#print(clf.n_support_)
#confusion_matrix(test_pred1, test_label)


from sklearn.neighbors.nearest_centroid import NearestCentroid
clf = NearestCentroid()
clf.fit(X, y)
test_pred2=clf.predict(test_set)
#print(accuracy_score(test_pred2,test_label))

onehot_pred2=test_pred2.reshape(45,-1)
onehot_pred2=ohc.fit_transform(onehot_pred2).toarray()
#print(onehot_pred2)
#confusion_matrix(test_pred2, test_label)

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix
clf = RandomForestClassifier()
clf.fit(X, y)
test_pred3=clf.predict(test_set)
#print(accuracy_score(test_pred3,test_label))
#print(confusion_matrix(test_pred3, test_label))
onehot_pred3=test_pred2.reshape(45,-1)
onehot_pred3=ohc.fit_transform(onehot_pred3).toarray()
#print(onehot_pred3)

#ensemble 1 : unanimous consensus
ensemble1_pred= onehot_pred1*onehot_pred2*onehot_pred3
#print(ensemble1_pred)
ensemble1_pred=np.argmax(ensemble1_pred,axis=1)
#print(ensemble1_pred)

#ensemble 2 : majority consensus
ensemble2_pred= (onehot_pred1+onehot_pred2+onehot_pred3)/2
ensemble2_pred= ensemble2_pred.astype('int64')
ensemble2_pred= ensemble2_pred.astype('float64')
ensemble2_pred=np.argmax(ensemble2_pred,axis=1)
#print(ensemble2_pred)
#print(test_label)
print(accuracy_score(ensemble2_pred,test_label))

